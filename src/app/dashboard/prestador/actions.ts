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
import { listNeighborhoodsAround } from "@/lib/provider-search";
import {
  PROVIDER_LIMITS,
  SUGGESTION_MESSAGES,
  UNKNOWN_CATEGORY_MESSAGE,
  UNKNOWN_CITY_MESSAGE,
  neighborhoodKey,
  parseNeighborhoodSuggestionInput,
  parseProviderProfile,
  type NeighborhoodSuggestionInput,
  type ProviderProfileInput,
  type SaveProviderProfileResult,
  type SuggestNeighborhoodsResult,
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
      fieldErrors: { city: UNKNOWN_CITY_MESSAGE },
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

export async function suggestNeighborhoods(
  input: NeighborhoodSuggestionInput,
): Promise<SuggestNeighborhoodsResult> {
  await requireSession("/dashboard/prestador");

  const parsed = parseNeighborhoodSuggestionInput(input);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    const found = await listNeighborhoodsAround(
      parsed.data.placeId,
      parsed.data.radiusKm,
    );
    if (!found) {
      return {
        ok: false,
        fieldErrors: { reference: SUGGESTION_MESSAGES.reference },
      };
    }
    return {
      ok: true,
      suggestions: found.slice(0, PROVIDER_LIMITS.neighborhoodsMax),
      totalFound: found.length,
    };
  } catch (error) {
    console.error("[provider] Falha ao sugerir bairros:", error);
    return {
      ok: false,
      fieldErrors: {},
      formError:
        "Não foi possível sugerir os bairros agora. Adicione à mão ou tente de novo.",
    };
  }
}
