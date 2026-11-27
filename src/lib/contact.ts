import { normalizePhone } from "@/lib/provider-validation";

const WHATSAPP_MESSAGE =
  "Olá! Vi seu perfil no ServiAqui e gostaria de saber mais sobre seus serviços.";

export function buildWhatsAppUrl(phone: string): string | null {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const query = new URLSearchParams({ text: WHATSAPP_MESSAGE });
  return `https://wa.me/55${normalizedPhone}?${query}`;
}

export function buildPhoneUrl(phone: string): string | null {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  return `tel:+55${normalizedPhone}`;
}
