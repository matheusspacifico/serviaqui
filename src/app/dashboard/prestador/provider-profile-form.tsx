"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BRAZILIAN_STATES,
  PROVIDER_LIMITS,
  formatPhoneInput,
  neighborhoodKey,
  parseProviderProfile,
  type ProviderField,
  type ProviderFieldErrors,
  type ProviderProfileInput,
} from "@/lib/provider-validation";
import { ChoiceChips } from "@/components/choice-chips";
import { Field, FormField, fieldDescribedBy } from "@/components/form-field";
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
import { saveProviderProfile } from "./actions";

const FIELD_ORDER: ProviderField[] = [
  "displayName",
  "phone",
  "categories",
  "hourlyRate",
  "description",
  "city",
  "state",
  "neighborhoods",
];

const CATEGORIES_HINT = `Escolha até ${PROVIDER_LIMITS.categoriesMax}.`;
const RATE_HINT = "Opcional. Deixe em branco para combinar com o cliente.";
const NEIGHBORHOODS_HINT = `Digite e aperte Enter. Até ${PROVIDER_LIMITS.neighborhoodsMax}.`;

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
  isEditing: boolean;
};

export function ProviderProfileForm({
  categories,
  initialValues,
  isEditing,
}: ProviderProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ProviderFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField
            label="Cidade"
            name="city"
            autoComplete="address-level2"
            value={values.city}
            error={fieldErrors.city}
            onChange={(event) => setValue("city", event.target.value)}
          />
          <Field label="UF" htmlFor="state" error={fieldErrors.state}>
            <Select
              value={values.state || null}
              onValueChange={(next) => setValue("state", next ?? "")}
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
        </div>
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
            aria-invalid={fieldErrors.neighborhoods ? true : undefined}
            aria-describedby={fieldDescribedBy("neighborhoods", {
              hint: NEIGHBORHOODS_HINT,
              error: fieldErrors.neighborhoods,
            })}
            onChange={(next) => setValue("neighborhoods", next)}
          />
        </Field>
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
