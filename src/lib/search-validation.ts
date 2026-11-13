import {
  isValidCoordinates,
  roundCoordinates,
  type Coordinates,
} from "./geo";

export const SEARCH_RADII_KM = [2, 5, 10, 20] as const;
export const DEFAULT_RADIUS_KM = 5;
export const SEARCH_SORTS = ["distancia", "avaliacao"] as const;
export const DEFAULT_SORT = "distancia";
export const SEARCH_RESULT_LIMIT = 50;

export const SEARCH_LIMITS = {
  categoryMax: 60,
  placeIdMax: 64,
  cityKeyMax: 80,
} as const;

export const SEARCH_MESSAGES = {
  category: "Escolha o serviço que você procura.",
  unknownCategory: "Escolha um serviço da lista.",
  sort: "Escolha uma das ordenações da lista.",
  radiusKm: "Escolha uma das distâncias da lista.",
  place: "Escolha um bairro da lista.",
  origin: "Não foi possível usar essa localização. Escolha um bairro.",
} as const;

export type SearchRadius = (typeof SEARCH_RADII_KM)[number];
export type SearchSort = (typeof SEARCH_SORTS)[number];

export type SearchOriginInput =
  | { kind: "coords"; lat: number; lng: number; radiusKm: number }
  | { kind: "place"; placeId: string; coords?: { lat: number; lng: number } };

export type SearchInput = {
  category: string;
  sort: string;
  origin: SearchOriginInput;
};

export type SearchField = "category" | "sort" | "radiusKm" | "place" | "origin";
export type SearchFieldErrors = Partial<Record<SearchField, string>>;

export type SearchData = {
  category: string;
  sort: SearchSort;
  origin:
    | { kind: "coords"; lat: number; lng: number; radiusKm: SearchRadius }
    | { kind: "place"; placeId: string; coords: Coordinates | null };
};

export type SearchCity = { state: string; cityKey: string; city: string };

export type SearchNeighborhood = {
  placeId: string;
  neighborhood: string;
  neighborhoodKey: string;
  providerCount: number;
  exact: boolean;
};

export type CityNeighborhoodsResult = {
  neighborhoods: SearchNeighborhood[];
  mapStatus: "loaded" | "unavailable" | "unknown-city";
};

export type ProviderSearchItem = {
  id: string;
  displayName: string;
  hourlyRateCents: number | null;
  services: { slug: string; name: string }[];
  neighborhood: string;
  distanceKm: number | null;
  ratingAverage: number | null;
  ratingCount: number;
};

export type SearchOriginResolved =
  | { kind: "coords"; radiusKm: number }
  | { kind: "place"; neighborhood: string; city: string; state: string };

export type SearchProvidersResult =
  | {
      ok: true;
      origin: SearchOriginResolved;
      providers: ProviderSearchItem[];
      truncated: boolean;
    }
  | { ok: false; fieldErrors: SearchFieldErrors; formError?: string };

export function isSearchRadius(value: unknown): value is SearchRadius {
  return (SEARCH_RADII_KM as readonly unknown[]).includes(value);
}

export function isSearchSort(value: unknown): value is SearchSort {
  return (SEARCH_SORTS as readonly unknown[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function parseSearchInput(
  input: SearchInput,
):
  | { ok: true; data: SearchData }
  | { ok: false; fieldErrors: SearchFieldErrors } {
  const raw = asRecord(input) ?? {};
  const fieldErrors: SearchFieldErrors = {};

  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  if (!category || category.length > SEARCH_LIMITS.categoryMax) {
    fieldErrors.category = SEARCH_MESSAGES.category;
  }

  const sort = raw.sort;
  if (!isSearchSort(sort)) fieldErrors.sort = SEARCH_MESSAGES.sort;

  const rawOrigin = asRecord(raw.origin);
  let origin: SearchData["origin"] | null = null;

  if (rawOrigin?.kind === "coords") {
    const coords = { lat: rawOrigin.lat, lng: rawOrigin.lng };
    const radiusKm = rawOrigin.radiusKm;
    if (!isValidCoordinates(coords)) {
      fieldErrors.origin = SEARCH_MESSAGES.origin;
    }
    if (!isSearchRadius(radiusKm)) {
      fieldErrors.radiusKm = SEARCH_MESSAGES.radiusKm;
    }
    if (isValidCoordinates(coords) && isSearchRadius(radiusKm)) {
      origin = { kind: "coords", ...roundCoordinates(coords), radiusKm };
    }
  } else if (rawOrigin?.kind === "place") {
    const placeId =
      typeof rawOrigin.placeId === "string" ? rawOrigin.placeId.trim() : "";
    if (!placeId || placeId.length > SEARCH_LIMITS.placeIdMax) {
      fieldErrors.place = SEARCH_MESSAGES.place;
    } else {
      const parsed = parseCoordinatesInput(rawOrigin.coords);
      origin = {
        kind: "place",
        placeId,
        coords: parsed.ok ? parsed.coords : null,
      };
    }
  } else {
    fieldErrors.origin = SEARCH_MESSAGES.origin;
  }

  if (!origin || !isSearchSort(sort) || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, data: { category, sort, origin } };
}

export function parseCoordinatesInput(
  input: unknown,
): { ok: true; coords: Coordinates } | { ok: false } {
  const raw = asRecord(input);
  if (!raw) return { ok: false };
  const coords = { lat: raw.lat, lng: raw.lng };
  if (!isValidCoordinates(coords)) return { ok: false };
  return { ok: true, coords: roundCoordinates(coords) };
}
