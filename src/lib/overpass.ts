import { isValidCoordinates } from "@/lib/geo";

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const REQUEST_TIMEOUT_MS = 45_000;
const MIN_INTERVAL_MS = 1100;
const RETRY_DELAY_MS = 3000;
const BUSY_STATUSES = [429, 502, 503, 504];

export type MapNeighborhood = { name: string; lat: number; lng: number };

let queue: Promise<unknown> = Promise.resolve();
let lastStartedAt = 0;
let warnedMissingUserAgent = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(ibgeCode: string): string {
  const filter = '["place"~"^(suburb|neighbourhood|quarter)$"]["name"](area.cidade)';
  return [
    "[out:json][timeout:40];",
    `area["IBGE:GEOCODIGO"="${ibgeCode}"]->.cidade;`,
    "(",
    `  node${filter};`,
    `  way${filter};`,
    `  relation${filter};`,
    ");",
    "out center tags;",
  ].join("\n");
}

async function request(query: string, userAgent: string): Promise<Response> {
  const wait = lastStartedAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastStartedAt = Date.now();
  return fetch(process.env.OVERPASS_URL || DEFAULT_OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function parseElements(payload: unknown): MapNeighborhood[] | null {
  const elements = (payload as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(elements)) return null;

  const items: MapNeighborhood[] = [];
  for (const element of elements) {
    if (typeof element !== "object" || element === null) continue;
    const { tags, lat, lon, center } = element as {
      tags?: { name?: unknown };
      lat?: unknown;
      lon?: unknown;
      center?: { lat?: unknown; lon?: unknown };
    };
    const name = typeof tags?.name === "string" ? tags.name.trim() : "";
    const coords = { lat: lat ?? center?.lat, lng: lon ?? center?.lon };
    if (name && isValidCoordinates(coords)) items.push({ name, ...coords });
  }
  return items;
}

async function run(ibgeCode: string, userAgent: string) {
  try {
    const query = buildQuery(ibgeCode);
    let response = await request(query, userAgent);
    if (BUSY_STATUSES.includes(response.status)) {
      await sleep(RETRY_DELAY_MS);
      response = await request(query, userAgent);
    }
    if (!response.ok) {
      console.error(`[overpass] HTTP ${response.status} para o município ${ibgeCode}.`);
      return null;
    }
    const items = parseElements(await response.json());
    if (!items) {
      console.error(`[overpass] Resposta inválida para o município ${ibgeCode}.`);
    }
    return items;
  } catch (error) {
    console.error(`[overpass] Falha ao consultar o município ${ibgeCode}:`, error);
    return null;
  }
}

// null = falha (timeout, servidor ocupado, resposta inválida).
// Lista vazia = o mapa não tem bairros para o município.
export async function fetchCityNeighborhoods(
  ibgeCode: string,
): Promise<MapNeighborhood[] | null> {
  if (!/^\d{7}$/.test(ibgeCode)) return null;

  const userAgent = process.env.GEO_USER_AGENT?.trim();
  if (!userAgent) {
    if (!warnedMissingUserAgent) {
      warnedMissingUserAgent = true;
      console.warn(
        "[overpass] GEO_USER_AGENT vazio: os bairros não serão carregados do mapa.",
      );
    }
    return null;
  }

  const result = queue.then(() => run(ibgeCode, userAgent));
  queue = result;
  return result;
}
