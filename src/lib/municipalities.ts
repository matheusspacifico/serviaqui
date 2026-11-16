import data from "@/data/municipalities.json";
import {
  CITY_DETECTION_RADIUS_KM,
  haversineKm,
  type Coordinates,
} from "@/lib/geo";
import { neighborhoodKey } from "@/lib/provider-validation";
import type { SearchCity } from "@/lib/search-validation";

export type Municipality = {
  code: string;
  name: string;
  cityKey: string;
  state: string;
  lat: number;
  lng: number;
};

const ALL: Municipality[] = data.map((item) => ({
  ...item,
  cityKey: neighborhoodKey(item.name),
}));

const BY_STATE = new Map<string, Municipality[]>();
const BY_KEY = new Map<string, Municipality>();

for (const municipality of ALL) {
  const list = BY_STATE.get(municipality.state) ?? [];
  list.push(municipality);
  BY_STATE.set(municipality.state, list);
  BY_KEY.set(`${municipality.state}|${municipality.cityKey}`, municipality);
}
for (const list of BY_STATE.values()) {
  list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function listMunicipalities(state: string): SearchCity[] {
  return (BY_STATE.get(state) ?? []).map(({ state, cityKey, name }) => ({
    state,
    cityKey,
    city: name,
  }));
}

export function findMunicipality(
  state: string,
  cityKey: string,
): Municipality | null {
  return BY_KEY.get(`${state}|${cityKey}`) ?? null;
}

export function nearestMunicipality(coords: Coordinates): Municipality | null {
  let nearest: Municipality | null = null;
  let best = CITY_DETECTION_RADIUS_KM;
  for (const municipality of ALL) {
    const distance = haversineKm(coords, municipality);
    if (distance <= best) {
      best = distance;
      nearest = municipality;
    }
  }
  return nearest;
}
