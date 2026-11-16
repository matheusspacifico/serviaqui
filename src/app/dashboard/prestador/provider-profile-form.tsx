"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { listCityNeighborhoods, listStateCities } from "@/lib/geo-actions";
import {
  BRAZILIAN_STATES,
  DEFAULT_SUGGESTION_RADIUS_KM,
  PROVIDER_LIMITS,
  SUGGESTION_MESSAGES,
  SUGGESTION_RADII_KM,
  formatPhoneInput,
  mergeSuggestedNeighborhoods,
  neighborhoodKey,
  parseProviderProfile,
  type ProviderField,
  type ProviderFieldErrors,
  type ProviderProfileInput,
  type SuggestNeighborhoodsResult,
  type SuggestionRadius,
} from "@/lib/provider-validation";
import type { SearchCity, SearchNeighborhood } from "@/lib/search-validation";
import { ChoiceChips } from "@/components/choice-chips";
import { Field, FormField, fieldDescribedBy } from "@/components/form-field";
import { SearchableSelect } from "@/components/searchable-select";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveProviderProfile, suggestNeighborhoods } from "./actions";

const FIELD_ORDER: ProviderField[] = [
  "displayName",
  "phone",
  "categories",
  "hourlyRate",
  "description",
  "state",
  "city",
  "neighborhoods",
];

const CATEGORIES_HINT = `Escolha até ${PROVIDER_LIMITS.categoriesMax}.`;
const RATE_HINT = "Opcional. Deixe em branco para combinar com o cliente.";
const NEIGHBORHOODS_HINT = `Digite para buscar. Não achou? Escreva o nome e aperte Enter. Até ${PROVIDER_LIMITS.neighborhoodsMax}.`;
const REFERENCE_HINT = "O bairro onde você fica ou de onde sai para atender.";
const SUGGESTION_FAILED =
  "Não foi possível sugerir os bairros agora. Adicione à mão ou tente de novo.";
const SLOW_MAP_MS = 2000;
const RADIUS_ITEMS = SUGGESTION_RADII_KM.map((radius) => ({
  value: radius,
  label: `Até ${radius} km`,
}));

type MapPlaces = {
  status: "idle" | "loading" | "loaded" | "unavailable";
  items: SearchNeighborhood[];
};

const NO_PLACES: MapPlaces = { status: "idle", items: [] };
const LOADING_PLACES: MapPlaces = { status: "loading", items: [] };

function suggestionSummary(
  result: Extract<SuggestNeighborhoodsResult, { ok: true }>,
  added: number,
  leftOut: number,
): string {
  const max = PROVIDER_LIMITS.neighborhoodsMax;
  if (result.suggestions.length <= 1) {
    return "Não encontramos outros bairros nesse raio. Adicione à mão ou aumente o raio.";
  }
  if (added === 0) {
    return leftOut > 0
      ? `A lista já está no limite de ${max} bairros.`
      : "Esses bairros já estavam na lista.";
  }
  const base =
    added === 1
      ? "1 bairro adicionado. Remova os que você não atende."
      : `${added} bairros adicionados. Remova os que você não atende.`;
  return leftOut > 0 || result.totalFound > result.suggestions.length
    ? `${base} O mapa tem ${result.totalFound} bairros nesse raio; ficaram os mais próximos, até o limite de ${max}.`
    : base;
}

function focusFirstInvalid(form: HTMLFormElement, errors: ProviderFieldErrors) {
  const field = FIELD_ORDER.find((name) => errors[name]);
  if (!field) return;
  const selector =
    field === "categories"
      ? 'input[name="categories"]:not(:disabled)'
      : `#${field}`;
  form.querySelector<HTMLElement>(selector)?.focus();
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type ProviderProfileFormProps = {
  categories: { slug: string; name: string }[];
  initialValues: ProviderProfileInput;
  initialFieldErrors?: ProviderFieldErrors;
  isEditing: boolean;
};

export function ProviderProfileForm({
  categories,
  initialValues,
  initialFieldErrors = {},
  isEditing,
}: ProviderProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] =
    useState<ProviderFieldErrors>(initialFieldErrors);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [cities, setCities] = useState<SearchCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(
    initialValues.state !== "",
  );
  const [mapPlaces, setMapPlaces] = useState<MapPlaces>(
    initialValues.state && initialValues.city ? LOADING_PLACES : NO_PLACES,
  );
  const [slowMap, setSlowMap] = useState(false);
  const [areasNotice, setAreasNotice] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<SuggestionRadius>(
    DEFAULT_SUGGESTION_RADIUS_KM,
  );
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggesting, startSuggesting] = useTransition();
  const citiesId = useRef(0);
  const placesId = useRef(0);

  const referenceOptions = mapPlaces.items
    .filter((place) => place.exact)
    .map((place) => ({ value: place.placeId, label: place.neighborhood }));
  const mapHasNoPlaces =
    mapPlaces.status === "loaded" && referenceOptions.length === 0;
  const suggestionDisabled =
    !values.city || mapPlaces.status !== "loaded" || mapHasNoPlaces;

  function loadCities(state: string) {
    setCities([]);
    setCitiesLoading(true);
    void fetchCities(state);
  }

  async function fetchCities(state: string) {
    const id = ++citiesId.current;
    let list: SearchCity[] = [];
    try {
      list = await listStateCities(state);
    } catch {
      list = [];
    }
    if (id !== citiesId.current) return;
    setCities(list);
    setCitiesLoading(false);
  }

  function loadPlaces(state: string, city: string) {
    setMapPlaces(LOADING_PLACES);
    setSlowMap(false);
    void fetchPlaces(state, city);
  }

  async function fetchPlaces(state: string, city: string) {
    const id = ++placesId.current;
    const slowTimer = setTimeout(() => {
      if (id === placesId.current) setSlowMap(true);
    }, SLOW_MAP_MS);
    let next: MapPlaces;
    try {
      const result = await listCityNeighborhoods({
        state,
        cityKey: neighborhoodKey(city),
      });
      next = {
        status: result.mapStatus === "loaded" ? "loaded" : "unavailable",
        items: result.neighborhoods,
      };
    } catch {
      next = { status: "unavailable", items: [] };
    }
    clearTimeout(slowTimer);
    if (id !== placesId.current) return;
    setSlowMap(false);
    setMapPlaces(next);
  }

  useEffect(() => {
    if (initialValues.state) void fetchCities(initialValues.state);
    if (initialValues.state && initialValues.city) {
      void fetchPlaces(initialValues.state, initialValues.city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetSuggestion() {
    setReference(null);
    setReferenceError(null);
    setSuggestionError(null);
    setSuggestionMessage("");
  }

  function changePlace(state: string, city: string) {
    const hadNeighborhoods = values.neighborhoods.length > 0;
    setValues((current) => ({ ...current, state, city, neighborhoods: [] }));
    setFieldErrors((current) => ({
      ...current,
      state: undefined,
      city: undefined,
      neighborhoods: undefined,
    }));
    setAreasNotice(
      hadNeighborhoods ? "Bairros removidos porque a cidade mudou." : "",
    );
    resetSuggestion();
    if (city) {
      loadPlaces(state, city);
    } else {
      placesId.current++;
      setMapPlaces(NO_PLACES);
    }
  }

  function handleStateChange(state: string) {
    if (state === values.state) return;
    changePlace(state, "");
    if (state) loadCities(state);
  }

  function handleCityChange(city: string) {
    if (city === values.city) return;
    changePlace(values.state, city);
  }

  function handleSuggest() {
    setSuggestionMessage("");
    setSuggestionError(null);
    if (!reference) {
      setReferenceError(SUGGESTION_MESSAGES.reference);
      return;
    }
    setReferenceError(null);

    startSuggesting(async () => {
      let result: SuggestNeighborhoodsResult;
      try {
        result = await suggestNeighborhoods({ placeId: reference, radiusKm });
      } catch {
        setSuggestionError(SUGGESTION_FAILED);
        return;
      }
      if (!result.ok) {
        setReferenceError(result.fieldErrors.reference ?? null);
        setSuggestionError(
          result.formError ?? result.fieldErrors.radiusKm ?? null,
        );
        return;
      }
      const merged = mergeSuggestedNeighborhoods(
        values.neighborhoods,
        result.suggestions.map((suggestion) => suggestion.name),
      );
      setValue("neighborhoods", merged.neighborhoods);
      setAreasNotice("");
      setSuggestionMessage(
        suggestionSummary(result, merged.added, merged.leftOut),
      );
    });
  }

  function setValue<K extends keyof ProviderProfileInput>(
    field: K,
    value: ProviderProfileInput[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== "phoneIsWhatsapp") {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);

    const parsed = parseProviderProfile(values);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      focusFirstInvalid(form, parsed.fieldErrors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      let result;
      try {
        result = await saveProviderProfile(values);
      } catch {
        setFormError("Não foi possível salvar o perfil. Tente de novo.");
        return;
      }
      if (!result.ok) {
        setFieldErrors(result.fieldErrors);
        setFormError(result.formError ?? null);
        focusFirstInvalid(form, result.fieldErrors);
        return;
      }
      toast.success(isEditing ? "Perfil atualizado." : "Perfil criado.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      <Section title="Sobre você">
        <FormField
          label="Nome de exibição"
          name="displayName"
          autoComplete="name"
          value={values.displayName}
          error={fieldErrors.displayName}
          onChange={(event) => setValue("displayName", event.target.value)}
        />
        <FormField
          label="Telefone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 91234-5678"
          value={values.phone}
          error={fieldErrors.phone}
          onChange={(event) =>
            setValue("phone", formatPhoneInput(event.target.value))
          }
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="phoneIsWhatsapp"
            className="size-4 accent-primary"
            checked={values.phoneIsWhatsapp}
            onChange={(event) =>
              setValue("phoneIsWhatsapp", event.target.checked)
            }
          />
          Este número tem WhatsApp
        </label>
      </Section>

      <Section title="O que você faz">
        <Field
          as="fieldset"
          label="Serviços"
          htmlFor="categories"
          hint={CATEGORIES_HINT}
          error={fieldErrors.categories}
        >
          <ChoiceChips
            name="categories"
            options={categories.map(({ slug, name }) => ({
              value: slug,
              label: name,
            }))}
            value={values.categories}
            max={PROVIDER_LIMITS.categoriesMax}
            onChange={(next) => setValue("categories", next)}
          />
        </Field>
        <Field
          label="Valor por hora"
          htmlFor="hourlyRate"
          hint={RATE_HINT}
          error={fieldErrors.hourlyRate}
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="hourlyRate"
              name="hourlyRate"
              inputMode="decimal"
              autoComplete="off"
              placeholder="80,00"
              className="pl-9"
              value={values.hourlyRate}
              aria-invalid={fieldErrors.hourlyRate ? true : undefined}
              aria-describedby={fieldDescribedBy("hourlyRate", {
                hint: RATE_HINT,
                error: fieldErrors.hourlyRate,
              })}
              onChange={(event) => setValue("hourlyRate", event.target.value)}
            />
          </div>
        </Field>
        <Field
          label="Descrição"
          htmlFor="description"
          hint={
            <span className="flex justify-between gap-4">
              <span>Opcional.</span>
              <span>
                {values.description.trim().length}/
                {PROVIDER_LIMITS.descriptionMax}
              </span>
            </span>
          }
          error={fieldErrors.description}
        >
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Conte sobre sua experiência e como você trabalha."
            value={values.description}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={fieldDescribedBy("description", {
              hint: true,
              error: fieldErrors.description,
            })}
            onChange={(event) => setValue("description", event.target.value)}
          />
        </Field>
      </Section>

      <Section title="Onde você atende">
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="UF" htmlFor="state" error={fieldErrors.state}>
            <Select
              value={values.state || null}
              onValueChange={(next) => handleStateChange(next ?? "")}
            >
              <SelectTrigger
                id="state"
                className="w-full"
                aria-invalid={fieldErrors.state ? true : undefined}
                aria-describedby={fieldDescribedBy("state", {
                  error: fieldErrors.state,
                })}
              >
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cidade" htmlFor="city" error={fieldErrors.city}>
            <SearchableSelect
              id="city"
              placeholder={
                values.state ? "Escolher cidade" : "Escolha a UF primeiro"
              }
              disabled={!values.state}
              options={cities.map((city) => ({
                value: city.city,
                label: city.city,
              }))}
              value={values.city || null}
              onChange={handleCityChange}
              filterPlaceholder="Digite o nome da cidade"
              filterLabel="Cidade"
              emptyMessage="Nenhuma cidade com esse nome."
              loading={citiesLoading}
              aria-invalid={fieldErrors.city ? true : undefined}
              aria-describedby={fieldDescribedBy("city", {
                error: fieldErrors.city,
              })}
            />
          </Field>
        </div>

        <fieldset
          disabled={suggestionDisabled}
          className="flex min-w-0 flex-col gap-4 rounded-xl border p-4"
        >
          <legend className="px-1 text-sm font-medium">
            Preencher por distância (opcional)
          </legend>
          {mapHasNoPlaces && (
            <p className="text-sm text-muted-foreground">
              O mapa não tem bairros cadastrados para esta cidade. Adicione os
              bairros à mão.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field
              label="Bairro de referência"
              htmlFor="reference"
              hint={REFERENCE_HINT}
              error={referenceError}
            >
              <SearchableSelect
                id="reference"
                placeholder="Escolher bairro"
                disabled={suggestionDisabled}
                options={referenceOptions}
                value={reference}
                onChange={(next) => {
                  setReference(next);
                  setReferenceError(null);
                }}
                filterPlaceholder="Digite o nome do bairro"
                filterLabel="Bairro de referência"
                emptyMessage="Nenhum bairro com esse nome."
                aria-invalid={referenceError ? true : undefined}
                aria-describedby={fieldDescribedBy("reference", {
                  hint: REFERENCE_HINT,
                  error: referenceError,
                })}
              />
            </Field>
            <Field label="Raio" htmlFor="suggestionRadius">
              <Select
                items={RADIUS_ITEMS}
                value={radiusKm}
                onValueChange={(next) =>
                  setRadiusKm(next ?? DEFAULT_SUGGESTION_RADIUS_KM)
                }
              >
                <SelectTrigger id="suggestionRadius" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={suggesting}
            onClick={handleSuggest}
          >
            {suggesting ? "Buscando bairros..." : "Sugerir bairros"}
          </Button>
          {suggestionError && (
            <p role="alert" className="text-sm text-destructive">
              {suggestionError}
            </p>
          )}
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground empty:hidden"
          >
            {suggestionMessage}
          </p>
        </fieldset>

        <Field
          label="Bairros"
          htmlFor="neighborhoods"
          hint={NEIGHBORHOODS_HINT}
          error={fieldErrors.neighborhoods}
        >
          <TagInput
            id="neighborhoods"
            placeholder="Ex.: Centro"
            emptyText="Nenhum bairro adicionado."
            value={values.neighborhoods}
            max={PROVIDER_LIMITS.neighborhoodsMax}
            keyOf={neighborhoodKey}
            suggestions={mapPlaces.items.map((place) => ({
              value: place.placeId,
              label: place.neighborhood,
            }))}
            aria-invalid={fieldErrors.neighborhoods ? true : undefined}
            aria-describedby={fieldDescribedBy("neighborhoods", {
              hint: NEIGHBORHOODS_HINT,
              error: fieldErrors.neighborhoods,
            })}
            onChange={(next) => {
              setValue("neighborhoods", next);
              setAreasNotice("");
            }}
          />
        </Field>
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground empty:hidden"
        >
          {areasNotice ||
            (mapPlaces.status === "loading"
              ? slowMap
                ? `Buscando os bairros de ${values.city} no mapa. Só demora na primeira vez.`
                : "Carregando os bairros da cidade..."
              : mapPlaces.status === "unavailable"
                ? "Não foi possível carregar os bairros do mapa. Você pode digitar os nomes."
                : "")}
        </p>
        <p className="text-xs text-muted-foreground">
          Bairros:{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            © OpenStreetMap
          </a>
        </p>
      </Section>

      <div className="flex flex-col gap-3">
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar perfil"}
        </Button>
      </div>
    </form>
  );
}
