export const PROVIDER_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  cityMin: 2,
  cityMax: 80,
  categoriesMax: 5,
  neighborhoodsMax: 10,
  neighborhoodMin: 2,
  neighborhoodMax: 60,
  rateMinCents: 100,
  rateMaxCents: 100_000,
  descriptionMax: 500,
} as const;

export const BRAZILIAN_STATES: readonly string[] = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export const UNKNOWN_CATEGORY_MESSAGE = "Escolha serviços da lista.";

export type ProviderField =
  | "displayName"
  | "phone"
  | "city"
  | "state"
  | "categories"
  | "neighborhoods"
  | "hourlyRate"
  | "description";

export type ProviderFieldErrors = Partial<Record<ProviderField, string>>;

export type ProviderProfileInput = {
  displayName: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  city: string;
  state: string;
  categories: string[];
  neighborhoods: string[];
  hourlyRate: string;
  description: string;
};

export type ProviderProfileData = {
  displayName: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  city: string;
  state: string;
  categories: string[];
  neighborhoods: { name: string; key: string }[];
  hourlyRateCents: number | null;
  description: string | null;
};

export type SaveProviderProfileResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: ProviderFieldErrors; formError?: string };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RATE_PLAIN = /^\d+(,\d{1,2})?$/;
const RATE_THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const RATE_DOT_DECIMAL = /^\d+\.\d{1,2}$/;

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

function isValidPhone(digits: string): boolean {
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (digits[0] === "0" || digits[1] === "0") return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  return true;
}

export function normalizePhone(value: string): string | null {
  const digits = phoneDigits(value);
  return isValidPhone(digits) ? digits : null;
}

export function parseHourlyRate(
  value: string,
): { cents: number | null } | { error: string } {
  const text = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return { cents: null };

  if (!RATE_PLAIN.test(text) && !RATE_THOUSANDS.test(text)) {
    return {
      error: RATE_DOT_DECIMAL.test(text)
        ? "Use vírgula para os centavos, como 80,50."
        : "Digite um valor como 80 ou 80,00.",
    };
  }

  const [whole, fraction = ""] = text.replace(/\./g, "").split(",");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    cents < PROVIDER_LIMITS.rateMinCents ||
    cents > PROVIDER_LIMITS.rateMaxCents
  ) {
    return { error: "O valor precisa ficar entre R$ 1,00 e R$ 1.000,00." };
  }
  return { cents };
}

export function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function neighborhoodKey(value: string): string {
  return collapseSpaces(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function parseCategories(
  value: unknown,
): { slugs: string[] } | { error: string } {
  if (!isStringArray(value)) return { error: "Escolha pelo menos um serviço." };
  const slugs = [...new Set(value)];
  if (slugs.length === 0) return { error: "Escolha pelo menos um serviço." };
  if (slugs.length > PROVIDER_LIMITS.categoriesMax) {
    return { error: `Escolha no máximo ${PROVIDER_LIMITS.categoriesMax} serviços.` };
  }
  if (!slugs.every((slug) => SLUG_PATTERN.test(slug))) {
    return { error: UNKNOWN_CATEGORY_MESSAGE };
  }
  return { slugs };
}

function parseNeighborhoods(
  value: unknown,
): { items: { name: string; key: string }[] } | { error: string } {
  if (!isStringArray(value)) return { error: "Adicione pelo menos um bairro." };

  const byKey = new Map<string, string>();
  for (const raw of value) {
    const name = collapseSpaces(raw);
    const key = neighborhoodKey(name);
    if (name && !byKey.has(key)) byKey.set(key, name);
  }
  const items = [...byKey].map(([key, name]) => ({ name, key }));

  if (items.length === 0) return { error: "Adicione pelo menos um bairro." };
  if (items.length > PROVIDER_LIMITS.neighborhoodsMax) {
    return {
      error: `Adicione no máximo ${PROVIDER_LIMITS.neighborhoodsMax} bairros.`,
    };
  }
  const outOfRange = items.some(
    ({ name }) =>
      name.length < PROVIDER_LIMITS.neighborhoodMin ||
      name.length > PROVIDER_LIMITS.neighborhoodMax,
  );
  if (outOfRange) {
    return {
      error: `Cada bairro precisa ter entre ${PROVIDER_LIMITS.neighborhoodMin} e ${PROVIDER_LIMITS.neighborhoodMax} caracteres.`,
    };
  }
  return { items };
}

export function parseProviderProfile(
  input: ProviderProfileInput,
):
  | { ok: true; data: ProviderProfileData }
  | { ok: false; fieldErrors: ProviderFieldErrors } {
  const raw: Record<string, unknown> =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const text = (field: string) => {
    const value = raw[field];
    return typeof value === "string" ? value : null;
  };
  const fieldErrors: ProviderFieldErrors = {};

  const displayName = text("displayName")?.trim() ?? "";
  if (!displayName) {
    fieldErrors.displayName =
      "Informe como você quer aparecer para os clientes.";
  } else if (
    displayName.length < PROVIDER_LIMITS.nameMin ||
    displayName.length > PROVIDER_LIMITS.nameMax
  ) {
    fieldErrors.displayName = `O nome precisa ter entre ${PROVIDER_LIMITS.nameMin} e ${PROVIDER_LIMITS.nameMax} caracteres.`;
  }

  const rawPhone = text("phone")?.trim() ?? "";
  const phone = normalizePhone(rawPhone);
  if (!rawPhone) {
    fieldErrors.phone = "Informe um telefone para contato.";
  } else if (!phone) {
    fieldErrors.phone = "Digite um telefone com DDD, como (11) 91234-5678.";
  }

  const categories = parseCategories(raw.categories);
  if ("error" in categories) fieldErrors.categories = categories.error;

  const rawRate = text("hourlyRate");
  const rate =
    rawRate === null
      ? { error: "Digite um valor como 80 ou 80,00." }
      : parseHourlyRate(rawRate);
  if ("error" in rate) fieldErrors.hourlyRate = rate.error;

  const rawDescription = text("description");
  const description = rawDescription?.trim() ?? "";
  if (
    rawDescription === null ||
    description.length > PROVIDER_LIMITS.descriptionMax
  ) {
    fieldErrors.description = `A descrição pode ter no máximo ${PROVIDER_LIMITS.descriptionMax} caracteres.`;
  }

  const city = text("city")?.trim() ?? "";
  if (!city) {
    fieldErrors.city = "Informe sua cidade.";
  } else if (
    city.length < PROVIDER_LIMITS.cityMin ||
    city.length > PROVIDER_LIMITS.cityMax
  ) {
    fieldErrors.city = `A cidade precisa ter entre ${PROVIDER_LIMITS.cityMin} e ${PROVIDER_LIMITS.cityMax} caracteres.`;
  }

  const state = text("state") ?? "";
  if (!BRAZILIAN_STATES.includes(state)) {
    fieldErrors.state = "Escolha o estado.";
  }

  const neighborhoods = parseNeighborhoods(raw.neighborhoods);
  if ("error" in neighborhoods) fieldErrors.neighborhoods = neighborhoods.error;

  if (
    !phone ||
    "error" in categories ||
    "error" in rate ||
    "error" in neighborhoods ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      displayName,
      phone,
      phoneIsWhatsapp: raw.phoneIsWhatsapp !== false,
      city,
      state,
      categories: categories.slugs,
      neighborhoods: neighborhoods.items,
      hourlyRateCents: rate.cents,
      description: description || null,
    },
  };
}

export function formatPhone(digits: string): string {
  if (digits.length <= 2) return digits;
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  const split = number.length === 9 ? 5 : 4;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}

export function formatPhoneInput(value: string): string {
  if (value.trimStart().startsWith("+")) return value;
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11 && !isValidPhone(digits.slice(0, 11))) {
    digits = phoneDigits(digits);
  }
  return formatPhone(digits.slice(0, 11));
}

export function formatCents(cents: number): string {
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+$)/g, ".");
  return `${whole},${(cents % 100).toString().padStart(2, "0")}`;
}

export function formatHourlyRate(cents: number | null): string {
  return cents === null ? "Valor a combinar" : `R$ ${formatCents(cents)}/h`;
}
