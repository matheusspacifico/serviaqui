import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { geoCity, geoPlace } from "@/db/schema";
import { findMunicipality } from "@/lib/municipalities";
import { fetchCityNeighborhoods } from "@/lib/overpass";
import {
  PROVIDER_LIMITS,
  collapseSpaces,
  neighborhoodKey,
} from "@/lib/provider-validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Executor = PgDatabase<PostgresJsQueryResultHKT, any, any>;

export type PlaceKey = { state: string; city: string; neighborhood: string };
export type CityLoadStatus = "loaded" | "unavailable" | "unknown-city";

const INSERT_CHUNK = 500;
const loading = new Map<string, Promise<CityLoadStatus>>();

export async function ensurePlaces(
  executor: Executor,
  places: PlaceKey[],
): Promise<string[]> {
  if (places.length === 0) return [];

  const rows = places.map(({ state, city, neighborhood }) => {
    const cityKey = neighborhoodKey(city);
    const municipality = findMunicipality(state, cityKey);
    return {
      state,
      city: municipality?.name ?? collapseSpaces(city),
      cityKey,
      neighborhood: collapseSpaces(neighborhood),
      neighborhoodKey: neighborhoodKey(neighborhood),
      origin: "provider" as const,
      lat: municipality?.lat ?? null,
      lng: municipality?.lng ?? null,
    };
  });
  const idKey = (row: { state: string; cityKey: string; neighborhoodKey: string }) =>
    `${row.state}|${row.cityKey}|${row.neighborhoodKey}`;

  const unique = [...new Map(rows.map((row) => [idKey(row), row])).values()];
  await executor.insert(geoPlace).values(unique).onConflictDoNothing();

  const ids = new Map<string, string>();
  const cities = new Map(unique.map((row) => [`${row.state}|${row.cityKey}`, row]));
  for (const { state, cityKey } of cities.values()) {
    const keys = unique
      .filter((row) => row.state === state && row.cityKey === cityKey)
      .map((row) => row.neighborhoodKey);
    const found = await executor
      .select({
        id: geoPlace.id,
        state: geoPlace.state,
        cityKey: geoPlace.cityKey,
        neighborhoodKey: geoPlace.neighborhoodKey,
      })
      .from(geoPlace)
      .where(
        and(
          eq(geoPlace.state, state),
          eq(geoPlace.cityKey, cityKey),
          inArray(geoPlace.neighborhoodKey, keys),
        ),
      );
    for (const row of found) ids.set(idKey(row), row.id);
  }

  return rows.map((row) => {
    const id = ids.get(idKey(row));
    if (!id) throw new Error("geo_place não gravou um dos lugares.");
    return id;
  });
}

async function loadCity(
  executor: Executor,
  city: { state: string; cityKey: string },
): Promise<CityLoadStatus> {
  const [loaded] = await executor
    .select({ state: geoCity.state })
    .from(geoCity)
    .where(and(eq(geoCity.state, city.state), eq(geoCity.cityKey, city.cityKey)))
    .limit(1);
  if (loaded) return "loaded";

  const municipality = findMunicipality(city.state, city.cityKey);
  if (!municipality) return "unknown-city";

  const fetched = await fetchCityNeighborhoods(municipality.code);
  if (!fetched) return "unavailable";

  const byKey = new Map<string, typeof geoPlace.$inferInsert>();
  for (const item of fetched) {
    const neighborhood = collapseSpaces(item.name);
    const key = neighborhoodKey(neighborhood);
    if (
      neighborhood.length < PROVIDER_LIMITS.neighborhoodMin ||
      neighborhood.length > PROVIDER_LIMITS.neighborhoodMax ||
      byKey.has(key)
    ) {
      continue;
    }
    byKey.set(key, {
      state: municipality.state,
      city: municipality.name,
      cityKey: municipality.cityKey,
      neighborhood,
      neighborhoodKey: key,
      origin: "osm",
      lat: item.lat,
      lng: item.lng,
    });
  }
  const rows = [...byKey.values()];

  await executor.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await tx
        .insert(geoPlace)
        .values(rows.slice(i, i + INSERT_CHUNK))
        .onConflictDoUpdate({
          target: [geoPlace.state, geoPlace.cityKey, geoPlace.neighborhoodKey],
          set: {
            neighborhood: sql`excluded.neighborhood`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
            origin: sql`excluded.origin`,
            updatedAt: new Date(),
          },
        });
    }
    await tx
      .insert(geoCity)
      .values({
        state: municipality.state,
        cityKey: municipality.cityKey,
        city: municipality.name,
        ibgeCode: municipality.code,
        neighborhoodsLoadedAt: new Date(),
        neighborhoodCount: rows.length,
      })
      .onConflictDoNothing();
  });

  return "loaded";
}

export async function ensureCityNeighborhoods(
  executor: Executor,
  city: { state: string; cityKey: string },
): Promise<CityLoadStatus> {
  const key = `${city.state}|${city.cityKey}`;
  const pending = loading.get(key);
  if (pending) return pending;

  const promise = loadCity(executor, city)
    .catch((error): CityLoadStatus => {
      console.error("[geo] Falha ao carregar os bairros da cidade:", error);
      return "unavailable";
    })
    .finally(() => loading.delete(key));
  loading.set(key, promise);
  return promise;
}
