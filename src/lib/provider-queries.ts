import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { providerProfile, serviceCategory } from "@/db/schema";

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
      areas: { columns: { neighborhood: true } },
    },
  });
  if (!row) return null;

  const { services, areas, ...profile } = row;
  return { ...profile, services: toServices(services), areas: toAreas(areas) };
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
