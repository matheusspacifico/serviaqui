"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  providerArea,
  providerProfile,
  providerService,
  serviceCategory,
} from "@/db/schema";
import {
  UNKNOWN_CATEGORY_MESSAGE,
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
  const { categories, neighborhoods, ...profile } = parsed.data;

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

    const id = await db.transaction(async (tx) => {
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
      await tx.insert(providerArea).values(
        neighborhoods.map(({ name, key }) => ({
          providerId: saved.id,
          neighborhood: name,
          neighborhoodKey: key,
        })),
      );

      return saved.id;
    });

    return { ok: true, id };
  } catch (error) {
    console.error("[provider] Falha ao salvar o perfil:", error);
    return {
      ok: false,
      fieldErrors: {},
      formError: "Não foi possível salvar o perfil. Tente de novo.",
    };
  }
}
