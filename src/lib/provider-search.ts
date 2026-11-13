import { and, asc, countDistinct, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  geoPlace,
  providerArea,
  providerProfile,
  providerService,
  serviceCategory,
} from "@/db/schema";
import {
  EARTH_RADIUS_KM,
  boundingBox,
  haversineKm,
  type Coordinates,
} from "@/lib/geo";
import {
  SEARCH_RESULT_LIMIT,
  type ProviderSearchItem,
  type SearchNeighborhood,
  type SearchSort,
} from "@/lib/search-validation";

type ProviderRow = Omit<ProviderSearchItem, "services">;
type SearchPage = { providers: ProviderSearchItem[]; truncated: boolean };

async function withServices(rows: ProviderRow[]): Promise<SearchPage> {
  const truncated = rows.length > SEARCH_RESULT_LIMIT;
  const page = rows.slice(0, SEARCH_RESULT_LIMIT);
  if (page.length === 0) return { providers: [], truncated };

  const services = await db
    .select({
      providerId: providerService.providerId,
      slug: serviceCategory.slug,
      name: serviceCategory.name,
    })
    .from(providerService)
    .innerJoin(
      serviceCategory,
      eq(providerService.categorySlug, serviceCategory.slug),
    )
    .where(
      inArray(
        providerService.providerId,
        page.map((row) => row.id),
      ),
    )
    .orderBy(asc(serviceCategory.sortOrder));

  const byProvider = new Map<string, { slug: string; name: string }[]>();
  for (const { providerId, slug, name } of services) {
    const list = byProvider.get(providerId) ?? [];
    list.push({ slug, name });
    byProvider.set(providerId, list);
  }

  return {
    providers: page.map((row) => ({
      ...row,
      services: byProvider.get(row.id) ?? [],
    })),
    truncated,
  };
}

export async function findProvidersByDistance(params: {
  category: string;
  coords: Coordinates;
  radiusKm: number;
  sort: SearchSort;
}): Promise<SearchPage> {
  const { category, coords, radiusKm } = params;
  const box = boundingBox(coords, radiusKm);

  const distance = sql`2 * ${EARTH_RADIUS_KM}::double precision * asin(least(1, sqrt(
    power(sin(radians(gp.lat - ${coords.lat}::double precision) / 2), 2) +
    cos(radians(${coords.lat}::double precision)) * cos(radians(gp.lat)) *
    power(sin(radians(gp.lng - ${coords.lng}::double precision) / 2), 2)
  )))`;

  const rows = await db.execute<{
    id: string;
    display_name: string;
    hourly_rate_cents: number | null;
    neighborhood: string;
    distance_km: number;
  }>(sql`
    with nearest as (
      select distinct on (pa.provider_id)
        pa.provider_id,
        gp.neighborhood,
        ${distance} as distance_km
      from provider_area pa
      inner join geo_place gp on gp.id = pa.place_id
      inner join provider_service ps
        on ps.provider_id = pa.provider_id and ps.category_slug = ${category}
      where gp.lat is not null
        and gp.lat between ${box.minLat}::double precision and ${box.maxLat}::double precision
        and gp.lng between ${box.minLng}::double precision and ${box.maxLng}::double precision
      order by pa.provider_id, distance_km asc, gp.neighborhood asc
    )
    select
      p.id,
      p.display_name,
      p.hourly_rate_cents,
      n.neighborhood,
      n.distance_km
    from nearest n
    inner join provider_profile p on p.id = n.provider_id
    where n.distance_km <= ${radiusKm}::double precision
    order by n.distance_km asc, p.display_name asc
    limit ${SEARCH_RESULT_LIMIT + 1}
  `);

  return withServices(
    rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      hourlyRateCents: row.hourly_rate_cents,
      neighborhood: row.neighborhood,
      distanceKm: Number(row.distance_km),
      ratingAverage: null,
      ratingCount: 0,
    })),
  );
}

export async function findProvidersByPlace(params: {
  category: string;
  place: { placeId: string; neighborhood: string; coords: Coordinates | null };
  clientCoords: Coordinates | null;
}): Promise<SearchPage> {
  const { category, place, clientCoords } = params;
  const distanceKm =
    clientCoords && place.coords ? haversineKm(clientCoords, place.coords) : null;

  const rows = await db
    .select({
      id: providerProfile.id,
      displayName: providerProfile.displayName,
      hourlyRateCents: providerProfile.hourlyRateCents,
    })
    .from(providerProfile)
    .innerJoin(
      providerService,
      and(
        eq(providerService.providerId, providerProfile.id),
        eq(providerService.categorySlug, category),
      ),
    )
    .innerJoin(
      providerArea,
      and(
        eq(providerArea.providerId, providerProfile.id),
        eq(providerArea.placeId, place.placeId),
      ),
    )
    .orderBy(asc(providerProfile.displayName))
    .limit(SEARCH_RESULT_LIMIT + 1);

  return withServices(
    rows.map((row) => ({
      ...row,
      neighborhood: place.neighborhood,
      distanceKm,
      ratingAverage: null,
      ratingCount: 0,
    })),
  );
}

export async function getSearchPlace(placeId: string): Promise<{
  placeId: string;
  neighborhood: string;
  city: string;
  cityKey: string;
  state: string;
  coords: Coordinates | null;
} | null> {
  const [row] = await db
    .select({
      placeId: geoPlace.id,
      neighborhood: geoPlace.neighborhood,
      city: geoPlace.city,
      cityKey: geoPlace.cityKey,
      state: geoPlace.state,
      origin: geoPlace.origin,
      lat: geoPlace.lat,
      lng: geoPlace.lng,
    })
    .from(geoPlace)
    .where(eq(geoPlace.id, placeId))
    .limit(1);
  if (!row) return null;

  const { origin, lat, lng, ...place } = row;
  return {
    ...place,
    coords:
      origin === "osm" && lat !== null && lng !== null ? { lat, lng } : null,
  };
}

export async function listNeighborhoodsOfCity(
  state: string,
  cityKey: string,
  category: string | null,
): Promise<SearchNeighborhood[]> {
  const base = db
    .select({
      placeId: geoPlace.id,
      neighborhood: geoPlace.neighborhood,
      neighborhoodKey: geoPlace.neighborhoodKey,
      providerCount: countDistinct(
        category === null ? providerArea.providerId : providerService.providerId,
      ),
    })
    .from(geoPlace)
    .leftJoin(providerArea, eq(providerArea.placeId, geoPlace.id));

  const joined =
    category === null
      ? base
      : base.leftJoin(
          providerService,
          and(
            eq(providerService.providerId, providerArea.providerId),
            eq(providerService.categorySlug, category),
          ),
        );

  const rows = await joined
    .where(and(eq(geoPlace.state, state), eq(geoPlace.cityKey, cityKey)))
    .groupBy(geoPlace.id);

  return rows.sort(
    (a, b) =>
      Number(b.providerCount > 0) - Number(a.providerCount > 0) ||
      a.neighborhood.localeCompare(b.neighborhood, "pt-BR"),
  );
}
