import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ensureCityNeighborhoods, ensurePlaces } from "@/lib/geo-places";
import { neighborhoodKey } from "@/lib/provider-validation";
import { geoCity, providerArea, providerProfile } from "./schema";

async function main() {
  const reload = process.argv.includes("--reload");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle({ client });

  try {
    const pending = await db
      .select({
        id: providerArea.id,
        neighborhood: providerArea.neighborhood,
        city: providerProfile.city,
        state: providerProfile.state,
      })
      .from(providerArea)
      .innerJoin(providerProfile, eq(providerArea.providerId, providerProfile.id))
      .where(isNull(providerArea.placeId));

    const placeIds = await ensurePlaces(db, pending);
    for (const [index, area] of pending.entries()) {
      await db
        .update(providerArea)
        .set({ placeId: placeIds[index] })
        .where(eq(providerArea.id, area.id));
    }

    const cities = await db
      .selectDistinct({ city: providerProfile.city, state: providerProfile.state })
      .from(providerProfile);

    const loaded: string[] = [];
    const unavailable: string[] = [];
    const unknown: string[] = [];
    const seen = new Set<string>();

    for (const { city, state } of cities) {
      const cityKey = neighborhoodKey(city);
      if (seen.has(`${state}|${cityKey}`)) continue;
      seen.add(`${state}|${cityKey}`);

      if (reload) {
        await db
          .delete(geoCity)
          .where(and(eq(geoCity.state, state), eq(geoCity.cityKey, cityKey)));
      }
      const status = await ensureCityNeighborhoods(db, { state, cityKey });
      const label = `${city}/${state}`;
      if (status === "loaded") loaded.push(label);
      else if (status === "unavailable") unavailable.push(label);
      else unknown.push(label);
    }

    const list = (items: string[]) =>
      items.length > 0 ? `${items.length} (${items.join(", ")})` : "0";
    console.log(`Áreas ligadas a um lugar: ${pending.length}`);
    console.log(`Cidades com bairros carregados: ${list(loaded)}`);
    console.log(`Cidades indisponíveis no mapa agora: ${list(unavailable)}`);
    console.log(`Cidades não reconhecidas (corrigir a grafia no perfil): ${list(unknown)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
