"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactEvent, providerProfile } from "@/db/schema";
import { buildPhoneUrl, buildWhatsAppUrl } from "@/lib/contact";
import { getSession } from "@/lib/session";

type ContactChannel = "whatsapp" | "phone";

export type ContactResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

async function beginContact(
  providerId: string,
  channel: ContactChannel,
): Promise<ContactResult> {
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
    if (channel === "whatsapp" && !profile.phoneIsWhatsapp) {
      return {
        ok: false,
        message: "Este prestador não recebe contatos pelo WhatsApp.",
      };
    }

    const url =
      channel === "whatsapp"
        ? buildWhatsAppUrl(profile.phone)
        : buildPhoneUrl(profile.phone);
    if (!url) {
      return {
        ok: false,
        message: "O telefone deste prestador está inválido para contato.",
      };
    }

    const session = await getSession();
    await db.insert(contactEvent).values({
      providerId,
      userId: session?.user.id ?? null,
      channel,
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

export async function beginWhatsAppContact(
  providerId: string,
): Promise<ContactResult> {
  return beginContact(providerId, "whatsapp");
}

export async function beginPhoneContact(
  providerId: string,
): Promise<ContactResult> {
  return beginContact(providerId, "phone");
}
