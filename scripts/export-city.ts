import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { geoCity, geoPlace } from "../src/db/schema";
import { neighborhoodKey } from "../src/lib/provider-validation";

const OUTPUT = resolve(__dirname, "../src/data/preloaded-cities.json");

type PreloadedCity = {
  state: string;
  city: string;
  cityKey: string;
  ibgeCode: string;
  neighborhoods: { name: string; lat: number; lng: number }[];
};

async function main() {
  const [state, cityName] = process.argv.slice(2);
  if (!state || !cityName) {
    throw new Error('Uso: pnpm data:city SP "São Carlos"');
  }
  const cityKey = neighborhoodKey(cityName);
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle({ client });

  try {
    const [city] = await db
      .select()
      .from(geoCity)
      .where(and(eq(geoCity.state, state), eq(geoCity.cityKey, cityKey)));
    if (!city) {
      throw new Error(
        `${cityName}/${state} ainda não foi carregada do mapa neste banco. Abra a cidade em /buscar primeiro.`,
      );
    }
    const places = await db
      .select({ name: geoPlace.neighborhood, lat: geoPlace.lat, lng: geoPlace.lng })
      .from(geoPlace)
      .where(
        and(
          eq(geoPlace.state, state),
          eq(geoPlace.cityKey, cityKey),
          eq(geoPlace.origin, "osm"),
        ),
      )
      .orderBy(asc(geoPlace.neighborhoodKey));

    const cities: PreloadedCity[] = existsSync(OUTPUT)
      ? JSON.parse(readFileSync(OUTPUT, "utf8"))
      : [];
    const entry: PreloadedCity = {
      state,
      city: city.city,
      cityKey,
      ibgeCode: city.ibgeCode,
      neighborhoods: places.flatMap(({ name, lat, lng }) =>
        lat === null || lng === null ? [] : [{ name, lat, lng }],
      ),
    };
    const next = [
      ...cities.filter((item) => item.state !== state || item.cityKey !== cityKey),
      entry,
    ].sort((a, b) => `${a.state}${a.cityKey}`.localeCompare(`${b.state}${b.cityKey}`));

    const json = `[\n${next
      .map(
        ({ neighborhoods, ...head }) =>
          `${JSON.stringify(head).slice(0, -1)},"neighborhoods":[\n${neighborhoods
            .map((item) => `  ${JSON.stringify(item)}`)
            .join(",\n")}\n]}`,
      )
      .join(",\n")}\n]\n`;
    writeFileSync(OUTPUT, json);
    console.log(
      `${entry.city}/${state}: ${entry.neighborhoods.length} bairros gravados em src/data/preloaded-cities.json.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
