"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  MapPinIcon,
} from "lucide-react";
import { cn } from "cn";
import {
  BROWSER_LOCATION_MESSAGES,
  getBrowserLocation,
  getLocationPermission,
} from "@/lib/browser-location";
import type { Coordinates } from "@/lib/geo";
import {
  detectCity,
  listCityNeighborhoods,
  listStateCities,
} from "@/lib/geo-actions";
import { BRAZILIAN_STATES } from "@/lib/provider-validation";
import {
  SEARCH_MESSAGES,
  SEARCH_RADII_KM,
  type CityNeighborhoodsResult,
  type ProviderSearchItem,
  type SearchCity,
  type SearchInput,
  type SearchOriginResolved,
  type SearchProvidersResult,
  type SearchRadius,
  type SearchSort,
} from "@/lib/search-validation";
import { ProviderCard, ProviderCardSkeleton } from "@/components/provider-card";
import { SearchableList } from "@/components/searchable-list";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchProviders } from "./actions";

type SearchMode = "distancia" | "bairro";
type SelectedPlace = { placeId: string; neighborhood: string };

type Criteria = {
  category: string;
  mode: SearchMode | null;
  coords: Coordinates | null;
  city: SearchCity | null;
  place: SelectedPlace | null;
  radiusKm: SearchRadius;
  sort: SearchSort;
};

type Outcome = {
  category: string;
  origin: SearchOriginResolved;
  providers: ProviderSearchItem[];
  truncated: boolean;
};

type Neighborhoods = CityNeighborhoodsResult & { loading: boolean };

export type SearchFormProps = {
  categories: { slug: string; name: string }[];
  initial: {
    category: string;
    radiusKm: SearchRadius;
    sort: SearchSort;
    place: (SelectedPlace & { city: SearchCity }) | null;
  };
};

const SORT_ITEMS: { value: SearchSort; label: string }[] = [
  { value: "distancia", label: "Mais próximos" },
  { value: "avaliacao", label: "Melhor avaliados" },
];
const MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: "distancia", label: "Distância" },
  { value: "bairro", label: "Bairro" },
];
const RADIUS_OPTIONS = SEARCH_RADII_KM.map((radius) => ({
  value: radius,
  label: `${radius} km`,
}));
const STATE_ITEMS = BRAZILIAN_STATES.map((uf) => ({ value: uf, label: uf }));
const SEARCH_OFFLINE =
  "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
const INITIAL_HINT =
  "Escolha um serviço e use sua localização, ou escolha um bairro nos filtros.";
const SLOW_MAP_MS = 2000;
const SKELETON_COUNT = 4;

const sameCity = (a: SearchCity | null, b: SearchCity | null) =>
  a !== null && b !== null && a.state === b.state && a.cityKey === b.cityKey;

const hasOrigin = (criteria: Criteria) =>
  (criteria.mode === "distancia" && criteria.coords !== null) ||
  (criteria.mode === "bairro" && criteria.place !== null);

function toSearchInput(criteria: Criteria): SearchInput | null {
  const { category, sort, mode, coords, place, radiusKm } = criteria;
  if (!category) return null;
  if (mode === "distancia" && coords) {
    return { category, sort, origin: { kind: "coords", ...coords, radiusKm } };
  }
  if (mode === "bairro" && place) {
    return {
      category,
      sort,
      origin: {
        kind: "place",
        placeId: place.placeId,
        ...(coords ? { coords } : {}),
      },
    };
  }
  return null;
}

function updateUrl({ category, sort, origin }: SearchInput) {
  const params = new URLSearchParams({ servico: category });
  if (origin.kind === "coords") {
    params.set("raio", String(origin.radiusKm));
    params.set("ordem", sort);
  } else {
    params.set("local", origin.placeId);
  }
  window.history.replaceState(null, "", `/buscar?${params}`);
}

function summaryOf(outcome: Outcome, serviceName: string): string {
  const count = outcome.providers.length;
  const who = count === 1 ? "1 prestador" : `${count} prestadores`;
  const where =
    outcome.origin.kind === "coords"
      ? `a até ${outcome.origin.radiusKm} km de você`
      : `em ${outcome.origin.neighborhood}, ${outcome.origin.city}/${outcome.origin.state}`;
  return `${who} de ${serviceName} ${where}${
    outcome.truncated ? ". Mostrando os 50 primeiros." : ""
  }`;
}

function emptyMessage(outcome: Outcome, serviceName: string): string {
  return outcome.origin.kind === "coords"
    ? `Infelizmente ainda não temos prestadores de ${serviceName} a até ${outcome.origin.radiusKm} km de você.`
    : "Infelizmente ainda não temos prestadores nessa região.";
}

function Segments<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">
        {legend}
      </legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex h-7 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground select-none has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start"
      autoFocus
      onClick={onClick}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Voltar
    </Button>
  );
}

export function SearchForm({ categories, initial }: SearchFormProps) {
  const initialCriteria: Criteria = {
    category: initial.category,
    mode: initial.place ? "bairro" : null,
    coords: null,
    city: initial.place?.city ?? null,
    place: initial.place
      ? {
          placeId: initial.place.placeId,
          neighborhood: initial.place.neighborhood,
        }
      : null,
    radiusKm: initial.radiusKm,
    sort: initial.sort,
  };

  const [criteria, setCriteria] = useState(initialCriteria);
  const criteriaRef = useRef(initialCriteria);
  const [detectedCity, setDetectedCity] = useState<SearchCity | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [screen, setScreen] = useState<"main" | "city" | "place">("main");
  const [cityState, setCityState] = useState(initial.place?.city.state ?? "");
  const [cities, setCities] = useState<SearchCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhoods>({
    neighborhoods: [],
    mapStatus: "loaded",
    loading: false,
  });
  const [slowMap, setSlowMap] = useState(false);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  const serviceRef = useRef<HTMLButtonElement>(null);
  const citiesCache = useRef(new Map<string, SearchCity[]>());
  const lastSearchKey = useRef<string | null>(null);
  const searchId = useRef(0);
  const citiesId = useRef(0);
  const neighborhoodsId = useRef(0);
  const detectId = useRef(0);

  const categoryItems = categories.map(({ slug, name }) => ({
    value: slug,
    label: name,
  }));
  const serviceName = (slug: string) =>
    categories
      .find((category) => category.slug === slug)
      ?.name.toLocaleLowerCase("pt-BR") ?? "";

  function runSearch(input: SearchInput) {
    const key = JSON.stringify(input);
    if (key === lastSearchKey.current) return;
    lastSearchKey.current = key;
    const id = ++searchId.current;

    startSearch(async () => {
      let result: SearchProvidersResult;
      try {
        result = await searchProviders(input);
      } catch {
        result = { ok: false, fieldErrors: {}, formError: SEARCH_OFFLINE };
      }
      if (id !== searchId.current) return;

      if (!result.ok) {
        const { category, place, ...others } = result.fieldErrors;
        lastSearchKey.current = null;
        setOutcome(null);
        setCategoryError(category ?? null);
        setPlaceError(place ?? null);
        setSearchError(result.formError ?? Object.values(others)[0] ?? null);
        return;
      }
      setSearchError(null);
      setOutcome({ category: input.category, ...result });
      updateUrl(input);
    });
  }

  function retrySearch() {
    const input = toSearchInput(criteriaRef.current);
    if (!input) return;
    lastSearchKey.current = null;
    setSearchError(null);
    runSearch(input);
  }

  function apply(patch: Partial<Criteria>) {
    const next = { ...criteriaRef.current, ...patch };
    criteriaRef.current = next;
    setCriteria(next);

    const input = toSearchInput(next);
    if (input) {
      setCategoryError(null);
      setPlaceError(null);
      runSearch(input);
      return;
    }
    searchId.current++;
    lastSearchKey.current = null;
    setOutcome(null);
    setSearchError(null);
    setCategoryError(
      !next.category && hasOrigin(next) ? SEARCH_MESSAGES.category : null,
    );
  }

  function openPanel(target: "main" | "city" | "place" = "main") {
    setScreen(target);
    setPanelOpen(true);
  }

  async function locate(interactive: boolean) {
    setLocating(true);
    setLocationError(null);
    const result = await getBrowserLocation();
    setLocating(false);

    if (!result.ok) {
      if (!interactive) return;
      setLocationError(BROWSER_LOCATION_MESSAGES[result.reason]);
      apply({ mode: "bairro" });
      openPanel();
      return;
    }
    apply({ coords: result.coords, mode: "distancia" });

    const id = ++detectId.current;
    let city: SearchCity | null = null;
    try {
      city = await detectCity(result.coords);
    } catch {
      city = null;
    }
    if (id !== detectId.current) return;
    setDetectedCity(city);
    if (city && !sameCity(criteriaRef.current.city, city)) {
      apply({ city, place: null });
    }
  }

  async function loadCities(state: string) {
    const id = ++citiesId.current;
    const cached = citiesCache.current.get(state);
    if (cached) {
      setCities(cached);
      setCitiesLoading(false);
      return;
    }
    setCities([]);
    setCitiesLoading(true);
    let list: SearchCity[] = [];
    try {
      list = await listStateCities(state);
      if (list.length > 0) citiesCache.current.set(state, list);
    } catch {
      list = [];
    }
    if (id !== citiesId.current) return;
    setCities(list);
    setCitiesLoading(false);
  }

  async function loadNeighborhoods() {
    const { city, category } = criteriaRef.current;
    if (!city) return;
    const id = ++neighborhoodsId.current;
    setNeighborhoods({ neighborhoods: [], mapStatus: "loaded", loading: true });
    setSlowMap(false);
    const slowTimer = setTimeout(() => {
      if (id === neighborhoodsId.current) setSlowMap(true);
    }, SLOW_MAP_MS);
    let result: CityNeighborhoodsResult;
    try {
      result = await listCityNeighborhoods({
        state: city.state,
        cityKey: city.cityKey,
        ...(category ? { category } : {}),
      });
    } catch {
      result = { neighborhoods: [], mapStatus: "unavailable" };
    }
    clearTimeout(slowTimer);
    if (id !== neighborhoodsId.current) return;
    setSlowMap(false);
    setNeighborhoods({ ...result, loading: false });
  }

  function handleCategoryChange(category: string) {
    apply({ category });
    if (!hasOrigin(criteriaRef.current)) openPanel();
  }

  function handleModeChange(mode: SearchMode) {
    if (mode === "distancia" && !criteriaRef.current.coords) {
      void locate(true);
      return;
    }
    apply({ mode });
  }

  function openCityScreen() {
    const state = criteriaRef.current.city?.state ?? cityState;
    setCityState(state);
    setScreen("city");
    if (state) void loadCities(state);
  }

  function handleCityChange(value: string) {
    const city = cities.find(
      (item) => `${item.state}|${item.cityKey}` === value,
    );
    if (!city) return;
    if (!sameCity(criteriaRef.current.city, city)) {
      apply({ city, place: null, mode: "bairro" });
    }
    setScreen("main");
  }

  function openPlaceScreen() {
    setScreen("place");
    void loadNeighborhoods();
  }

  function handlePlaceChange(placeId: string) {
    const place = neighborhoods.neighborhoods.find(
      (item) => item.placeId === placeId,
    );
    if (!place) return;
    apply({
      place: { placeId, neighborhood: place.neighborhood },
      mode: "bairro",
    });
    setPanelOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const input = toSearchInput(criteriaRef.current);
      if (input) {
        runSearch(input);
        return;
      }
      if (criteriaRef.current.place) return;
      const permission = await getLocationPermission();
      if (!cancelled && permission === "granted") await locate(false);
    }
    void start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { category, mode, coords, city, place, radiusKm, sort } = criteria;
  const filterSummary =
    mode === "distancia" && coords
      ? `${radiusKm} km`
      : mode === "bairro" && place
        ? place.neighborhood
        : "Filtros";
  const isEmpty = outcome !== null && outcome.providers.length === 0;
  const emptyRadius =
    outcome?.origin.kind === "coords" ? outcome.origin.radiusKm : null;
  const nextRadius =
    emptyRadius === null
      ? undefined
      : SEARCH_RADII_KM.find((option) => option > emptyRadius);
  const otherCityNote =
    coords !== null &&
    city !== null &&
    detectedCity !== null &&
    !sameCity(city, detectedCity);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={locating}
            aria-label={
              coords
                ? "Localização ativa. Atualizar."
                : "Usar minha localização"
            }
            className={cn(
              coords &&
                "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
            onClick={() => void locate(true)}
          >
            {locating ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <MapPinIcon />
            )}
          </Button>
          <Select
            items={categoryItems}
            value={category || null}
            onValueChange={(next) => handleCategoryChange(next ?? "")}
          >
            <SelectTrigger
              ref={serviceRef}
              id="servico"
              aria-label="Serviço"
              aria-invalid={categoryError ? true : undefined}
              aria-describedby={categoryError ? "servico-error" : undefined}
              className="min-w-0 flex-1"
            >
              <SelectValue placeholder="Qual serviço?" />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover
            open={panelOpen}
            onOpenChange={(open) => {
              setPanelOpen(open);
              if (open) setScreen("main");
            }}
          >
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="max-w-[40%] shrink-0"
                />
              }
            >
              <ListFilterIcon data-icon="inline-start" />
              <span className="truncate">{filterSummary}</span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              finalFocus={categoryError ? serviceRef : undefined}
              className="w-[calc(100vw-2rem)] max-w-sm gap-4 p-4"
            >
              {screen === "main" && (
                <>
                  <PopoverTitle className="font-heading text-base">
                    Filtros
                  </PopoverTitle>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm leading-none font-medium">
                      Cidade
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start"
                      autoFocus
                      onClick={openCityScreen}
                    >
                      <span className="truncate">
                        {city
                          ? `${city.city}/${city.state}`
                          : "Escolher cidade"}
                      </span>
                    </Button>
                  </div>
                  <Segments
                    legend="Buscar por"
                    name="modo"
                    options={MODE_OPTIONS}
                    value={mode}
                    onChange={handleModeChange}
                  />
                  {otherCityNote && (
                    <p className="text-sm text-muted-foreground">
                      A busca por distância usa sua localização atual. Para
                      outra cidade, escolha o bairro.
                    </p>
                  )}
                  {mode === "distancia" && (
                    <>
                      <div className="flex flex-col gap-2">
                        <Segments
                          legend="Distância"
                          name="raio"
                          options={RADIUS_OPTIONS}
                          value={radiusKm}
                          onChange={(next) => apply({ radiusKm: next })}
                        />
                        <p className="text-sm text-muted-foreground">
                          A partir da sua localização atual.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span
                          id="ordem-label"
                          className="text-sm leading-none font-medium"
                        >
                          Ordenar por
                        </span>
                        <Select
                          items={SORT_ITEMS}
                          value={sort}
                          onValueChange={(next) =>
                            apply({ sort: next ?? "distancia" })
                          }
                        >
                          <SelectTrigger
                            aria-labelledby="ordem-label"
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SORT_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {mode === "bairro" && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm leading-none font-medium">
                        Bairro
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        disabled={!city}
                        aria-invalid={placeError ? true : undefined}
                        onClick={openPlaceScreen}
                      >
                        <span className="truncate">
                          {place ? place.neighborhood : "Escolher bairro"}
                        </span>
                      </Button>
                      {!city && (
                        <p className="text-sm text-muted-foreground">
                          Escolha a cidade primeiro.
                        </p>
                      )}
                      {placeError && (
                        <p role="alert" className="text-sm text-destructive">
                          {placeError}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              {screen === "city" && (
                <>
                  <BackButton onClick={() => setScreen("main")} />
                  <PopoverTitle className="font-heading text-base">
                    Escolher cidade
                  </PopoverTitle>
                  <Select
                    items={STATE_ITEMS}
                    value={cityState || null}
                    onValueChange={(next) => {
                      setCityState(next ?? "");
                      if (next) void loadCities(next);
                    }}
                  >
                    <SelectTrigger aria-label="Estado (UF)" className="w-full">
                      <SelectValue placeholder="Estado (UF)" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cityState ? (
                    <SearchableList
                      key={cityState}
                      options={cities.map((item) => ({
                        value: `${item.state}|${item.cityKey}`,
                        label: item.city,
                      }))}
                      value={city ? `${city.state}|${city.cityKey}` : null}
                      onChange={handleCityChange}
                      filterPlaceholder="Digite o nome da cidade"
                      filterLabel="Cidade"
                      emptyMessage="Nenhuma cidade com esse nome."
                      loading={citiesLoading}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Escolha o estado para ver as cidades.
                    </p>
                  )}
                </>
              )}
              {screen === "place" && city && (
                <>
                  <BackButton onClick={() => setScreen("main")} />
                  <PopoverTitle className="font-heading text-base">
                    Bairros de {city.city}/{city.state}
                  </PopoverTitle>
                  {!neighborhoods.loading &&
                    neighborhoods.mapStatus === "unavailable" && (
                      <div
                        role="alert"
                        className="flex flex-col items-start gap-2 rounded-lg bg-warning px-3 py-2 text-sm text-warning-foreground"
                      >
                        Não foi possível carregar todos os bairros agora.
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void loadNeighborhoods()}
                        >
                          Tentar de novo
                        </Button>
                      </div>
                    )}
                  {!neighborhoods.loading &&
                    neighborhoods.mapStatus === "loaded" &&
                    neighborhoods.neighborhoods.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        O mapa não tem bairros cadastrados para {city.city}. Use
                        a busca por distância.
                      </p>
                    )}
                  <p
                    aria-live="polite"
                    className="text-sm text-muted-foreground empty:hidden"
                  >
                    {neighborhoods.loading && slowMap
                      ? `Buscando os bairros de ${city.city} no mapa. Só demora na primeira vez.`
                      : ""}
                  </p>
                  <SearchableList
                    options={neighborhoods.neighborhoods.map((item) => ({
                      value: item.placeId,
                      label: item.neighborhood,
                      hint:
                        item.providerCount > 0
                          ? String(item.providerCount)
                          : "sem prestadores",
                      muted: item.providerCount === 0,
                    }))}
                    value={place?.placeId ?? null}
                    onChange={handlePlaceChange}
                    filterPlaceholder="Digite o nome do bairro"
                    filterLabel="Bairro"
                    emptyMessage="Nenhum bairro com esse nome."
                    loading={neighborhoods.loading}
                  />
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {categoryError && (
          <p
            id="servico-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {categoryError}
          </p>
        )}
        {locationError && (
          <p role="alert" className="text-sm text-muted-foreground">
            {locationError}
          </p>
        )}
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground empty:hidden"
        >
          {locating ? "Obtendo localização..." : ""}
        </p>
      </div>

      <section
        aria-label="Resultados"
        aria-busy={searching}
        className="flex flex-col gap-3"
      >
        <p
          aria-live="polite"
          className={cn(
            "text-sm text-muted-foreground",
            isEmpty && "text-base font-medium text-foreground",
          )}
        >
          {outcome
            ? isEmpty
              ? emptyMessage(outcome, serviceName(outcome.category))
              : summaryOf(outcome, serviceName(outcome.category))
            : searching
              ? "Buscando prestadores..."
              : searchError
                ? ""
                : INITIAL_HINT}
        </p>
        {searchError && (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive">{searchError}</p>
            <Button type="button" variant="outline" onClick={retrySearch}>
              Tentar de novo
            </Button>
          </div>
        )}
        {!outcome && searching && (
          <ul className="flex flex-col gap-3">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <ProviderCardSkeleton />
              </li>
            ))}
          </ul>
        )}
        {outcome && isEmpty && (
          <div
            className={cn(
              "flex flex-col items-start gap-3 transition-opacity",
              searching && "opacity-60",
            )}
          >
            {outcome.origin.kind === "place" ? (
              <p className="text-sm text-muted-foreground">
                Tente outro bairro ou busque por distância.
              </p>
            ) : nextRadius ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => apply({ radiusKm: nextRadius })}
              >
                Buscar em até {nextRadius} km
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tente outro serviço ou escolha um bairro nos filtros.
              </p>
            )}
          </div>
        )}
        {outcome && outcome.providers.length > 0 && (
          <ul
            className={cn(
              "flex flex-col gap-3 transition-opacity",
              searching && "opacity-60",
            )}
          >
            {outcome.providers.map((provider) => (
              <li key={provider.id}>
                <ProviderCard
                  provider={provider}
                  highlightSlug={outcome.category}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
