import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { geoCity, providerProfile, serviceCategory } from "@/db/schema";
import { findMunicipality } from "@/lib/municipalities";
import { neighborhoodKey } from "@/lib/provider-validation";

export type AreaPrecision = "exact" | "city" | "none";

type ServiceRow = { category: { slug: string; name: string; sortOrder: number } };
type AreaRow = { neighborhood: string };

function toServices(rows: ServiceRow[]): { slug: string; name: string }[] {
  return rows
    .map((row) => row.category)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ slug, name }) => ({ slug, name }));
}

function toAreas(rows: AreaRow[]): string[] {
  return rows
    .map((row) => row.neighborhood)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function listServiceCategories(): Promise<
  { slug: string; name: string }[]
> {
  return db
    .select({ slug: serviceCategory.slug, name: serviceCategory.name })
    .from(serviceCategory)
    .orderBy(asc(serviceCategory.sortOrder));
}

export const hasProviderProfile = cache(async (userId: string) => {
  const [row] = await db
    .select({ id: providerProfile.id })
    .from(providerProfile)
    .where(eq(providerProfile.userId, userId))
    .limit(1);
  return row !== undefined;
});

export async function getOwnProviderProfile(userId: string) {
  const row = await db.query.providerProfile.findFirst({
    where: eq(providerProfile.userId, userId),
    columns: {
      id: true,
      displayName: true,
      phone: true,
      phoneIsWhatsapp: true,
      city: true,
      state: true,
      hourlyRateCents: true,
      description: true,
    },
    with: {
      services: { columns: {}, with: { category: true } },
      areas: {
        columns: { neighborhood: true },
        with: { place: { columns: { origin: true, lat: true } } },
      },
    },
  });
  if (!row) return null;

  const { services, areas, ...profile } = row;
  const cityKey = neighborhoodKey(profile.city);
  const cityRecognized = findMunicipality(profile.state, cityKey) !== null;
  const [loaded] = cityRecognized
    ? await db
        .select({ state: geoCity.state })
        .from(geoCity)
        .where(and(eq(geoCity.state, profile.state), eq(geoCity.cityKey, cityKey)))
        .limit(1)
    : [];

  return {
    ...profile,
    services: toServices(services),
    cityRecognized,
    cityLoaded: loaded !== undefined,
    areas: areas
      .map(({ neighborhood, place }) => {
        const precision: AreaPrecision =
          !place || place.lat === null
            ? "none"
            : place.origin === "osm"
              ? "exact"
              : "city";
        return { neighborhood, precision };
      })
      .sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, "pt-BR")),
  };
}

export const getPublicProviderProfile = cache(async (id: string) => {
  const row = await db.query.providerProfile.findFirst({
    where: eq(providerProfile.id, id),
    columns: {
      id: true,
      userId: true,
      displayName: true,
      city: true,
      state: true,
      hourlyRateCents: true,
      description: true,
    },
    with: {
      services: { columns: {}, with: { category: true } },
      areas: { columns: { neighborhood: true } },
    },
  });
  if (!row) return null;

  const { services, areas, ...profile } = row;
  return { ...profile, services: toServices(services), areas: toAreas(areas) };
});
