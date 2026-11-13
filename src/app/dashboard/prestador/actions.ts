"use server";

import { after } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  providerArea,
  providerProfile,
  providerService,
  serviceCategory,
} from "@/db/schema";
import { ensureCityNeighborhoods, ensurePlaces } from "@/lib/geo-places";
import { findMunicipality } from "@/lib/municipalities";
import {
  UNKNOWN_CATEGORY_MESSAGE,
  neighborhoodKey,
  parseProviderProfile,
  type ProviderProfileInput,
  type SaveProviderProfileResult,
} from "@/lib/provider-validation";
import { requireSession } from "@/lib/session";

export async function saveProviderProfile(
  input: ProviderProfileInput,
): Promise<SaveProviderProfileResult> {
  const session = await requireSession("/dashboard/prestador");
  const userId = session.user.id;

  const parsed = parseProviderProfile(input);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { categories, neighborhoods, ...typed } = parsed.data;

  const municipality = findMunicipality(typed.state, neighborhoodKey(typed.city));
  if (!municipality) {
    return {
      ok: false,
      fieldErrors: {
        city: `Não encontramos essa cidade em ${typed.state}. Confira a grafia.`,
      },
    };
  }
  const profile = { ...typed, city: municipality.name };

  let id: string;
  try {
    const known = await db
      .select({ slug: serviceCategory.slug })
      .from(serviceCategory)
      .where(inArray(serviceCategory.slug, categories));
    if (known.length !== categories.length) {
      return {
        ok: false,
        fieldErrors: { categories: UNKNOWN_CATEGORY_MESSAGE },
      };
    }

    id = await db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(providerProfile)
        .values({ userId, ...profile })
        .onConflictDoUpdate({
          target: providerProfile.userId,
          set: { ...profile, updatedAt: new Date() },
        })
        .returning({ id: providerProfile.id });

      await tx
        .delete(providerService)
        .where(eq(providerService.providerId, saved.id));
      await tx.delete(providerArea).where(eq(providerArea.providerId, saved.id));

      await tx.insert(providerService).values(
        categories.map((categorySlug) => ({
          providerId: saved.id,
          categorySlug,
        })),
      );
      const placeIds = await ensurePlaces(
        tx,
        neighborhoods.map(({ name }) => ({
          state: profile.state,
          city: profile.city,
          neighborhood: name,
        })),
      );
      await tx.insert(providerArea).values(
        neighborhoods.map(({ name, key }, index) => ({
          providerId: saved.id,
          neighborhood: name,
          neighborhoodKey: key,
          placeId: placeIds[index],
        })),
      );

      return saved.id;
    });
  } catch (error) {
    console.error("[provider] Falha ao salvar o perfil:", error);
    return {
      ok: false,
      fieldErrors: {},
      formError: "Não foi possível salvar o perfil. Tente de novo.",
    };
  }

  after(() =>
    ensureCityNeighborhoods(db, {
      state: municipality.state,
      cityKey: municipality.cityKey,
    }),
  );

  return { ok: true, id };
}
