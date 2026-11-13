"use server";

import { db } from "@/db";
import { ensureCityNeighborhoods } from "@/lib/geo-places";
import { listMunicipalities, nearestMunicipality } from "@/lib/municipalities";
import { listNeighborhoodsOfCity } from "@/lib/provider-search";
import { BRAZILIAN_STATES } from "@/lib/provider-validation";
import {
  SEARCH_LIMITS,
  parseCoordinatesInput,
  type CityNeighborhoodsResult,
  type SearchCity,
} from "@/lib/search-validation";

export async function listStateCities(state: string): Promise<SearchCity[]> {
  if (typeof state !== "string" || !BRAZILIAN_STATES.includes(state)) return [];
  return listMunicipalities(state);
}

export async function listCityNeighborhoods(input: {
  state: string;
  cityKey: string;
  category?: string;
}): Promise<CityNeighborhoodsResult> {
  const raw: Record<string, unknown> =
    typeof input === "object" && input !== null ? input : {};
  const { state, cityKey, category } = raw;

  if (
    typeof state !== "string" ||
    !BRAZILIAN_STATES.includes(state) ||
    typeof cityKey !== "string" ||
    !cityKey ||
    cityKey.length > SEARCH_LIMITS.cityKeyMax ||
    (category !== undefined &&
      (typeof category !== "string" ||
        category.length > SEARCH_LIMITS.categoryMax))
  ) {
    return { neighborhoods: [], mapStatus: "unknown-city" };
  }

  try {
    const mapStatus = await ensureCityNeighborhoods(db, { state, cityKey });
    const neighborhoods = await listNeighborhoodsOfCity(
      state,
      cityKey,
      category || null,
    );
    return { neighborhoods, mapStatus };
  } catch (error) {
    console.error("[geo] Falha ao listar os bairros da cidade:", error);
    return { neighborhoods: [], mapStatus: "unavailable" };
  }
}

export async function detectCity(input: unknown): Promise<SearchCity | null> {
  const parsed = parseCoordinatesInput(input);
  if (!parsed.ok) return null;

  const municipality = nearestMunicipality(parsed.coords);
  if (!municipality) return null;
  return {
    state: municipality.state,
    cityKey: municipality.cityKey,
    city: municipality.name,
  };
}
