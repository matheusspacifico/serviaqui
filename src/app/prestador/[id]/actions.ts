"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactEvent, providerProfile } from "@/db/schema";
import { buildWhatsAppUrl } from "@/lib/contact";
import { getSession } from "@/lib/session";

export type WhatsAppContactResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function beginWhatsAppContact(
  providerId: string,
): Promise<WhatsAppContactResult> {
  if (
    typeof providerId !== "string" ||
    providerId.length === 0 ||
    providerId.length > 128
  ) {
    return { ok: false, message: "Este perfil não está disponível." };
  }

  try {
    const [profile] = await db
      .select({
        phone: providerProfile.phone,
        phoneIsWhatsapp: providerProfile.phoneIsWhatsapp,
      })
      .from(providerProfile)
      .where(eq(providerProfile.id, providerId))
      .limit(1);

    if (!profile) {
      return { ok: false, message: "Este perfil não está disponível." };
    }
    if (!profile.phoneIsWhatsapp) {
      return {
        ok: false,
        message: "Este prestador não recebe contatos pelo WhatsApp.",
      };
    }

    const url = buildWhatsAppUrl(profile.phone);
    if (!url) {
      return {
        ok: false,
        message: "O telefone deste prestador está inválido para WhatsApp.",
      };
    }

    const session = await getSession();
    await db.insert(contactEvent).values({
      providerId,
      userId: session?.user.id ?? null,
      channel: "whatsapp",
    });

    return { ok: true, url };
  } catch (error) {
    console.error("[contact] Falha ao iniciar contato por WhatsApp:", error);
    return {
      ok: false,
      message: "Não foi possível iniciar o contato agora. Tente novamente.",
    };
  }
}
