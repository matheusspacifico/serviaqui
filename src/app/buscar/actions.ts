"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { serviceCategory } from "@/db/schema";
import {
  findProvidersByDistance,
  findProvidersByPlace,
  getSearchPlace,
} from "@/lib/provider-search";
import {
  SEARCH_MESSAGES,
  parseSearchInput,
  type SearchInput,
  type SearchProvidersResult,
} from "@/lib/search-validation";

export async function searchProviders(
  input: SearchInput,
): Promise<SearchProvidersResult> {
  const parsed = parseSearchInput(input);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { category, sort, origin } = parsed.data;

  try {
    const [known] = await db
      .select({ slug: serviceCategory.slug })
      .from(serviceCategory)
      .where(eq(serviceCategory.slug, category))
      .limit(1);
    if (!known) {
      return {
        ok: false,
        fieldErrors: { category: SEARCH_MESSAGES.unknownCategory },
      };
    }

    if (origin.kind === "place") {
      const place = await getSearchPlace(origin.placeId);
      if (!place) {
        return { ok: false, fieldErrors: { place: SEARCH_MESSAGES.place } };
      }
      const result = await findProvidersByPlace({
        category,
        place,
        clientCoords: origin.coords,
      });
      return {
        ok: true,
        origin: {
          kind: "place",
          neighborhood: place.neighborhood,
          city: place.city,
          state: place.state,
        },
        ...result,
      };
    }

    const result = await findProvidersByDistance({
      category,
      coords: { lat: origin.lat, lng: origin.lng },
      radiusKm: origin.radiusKm,
      sort,
    });
    return {
      ok: true,
      origin: { kind: "coords", radiusKm: origin.radiusKm },
      ...result,
    };
  } catch (error) {
    console.error("[search] Falha ao buscar prestadores:", error);
    return {
      ok: false,
      fieldErrors: {},
      formError: "Não foi possível buscar agora. Tente de novo.",
    };
  }
}
