import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import preloadedCities from "@/data/preloaded-cities.json";
import { neighborhoodKey } from "@/lib/provider-validation";
import { geoCity, geoPlace, serviceCategory } from "./schema";

const CATEGORIES: [slug: string, name: string][] = [
  ["eletricista", "Eletricista"],
  ["encanador", "Encanador"],
  ["diarista", "Diarista"],
  ["pintor", "Pintor"],
  ["pedreiro", "Pedreiro"],
  ["jardineiro", "Jardineiro"],
  ["marceneiro", "Marceneiro"],
  ["montador-de-moveis", "Montador de móveis"],
  ["chaveiro", "Chaveiro"],
  ["ar-condicionado", "Técnico de ar-condicionado"],
  ["informatica", "Técnico de informática"],
  ["eletrodomesticos", "Conserto de eletrodomésticos"],
  ["fretes-e-mudancas", "Fretes e mudanças"],
  ["baba", "Babá"],
  ["cuidador-de-idosos", "Cuidador de idosos"],
  ["manicure", "Manicure e pedicure"],
  ["cabeleireiro", "Cabeleireiro"],
  ["aulas-particulares", "Aulas particulares"],
];

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle({ client });

  try {
    const rows = await db
      .insert(serviceCategory)
      .values(
        CATEGORIES.map(([slug, name], index) => ({
          slug,
          name,
          sortOrder: index + 1,
        })),
      )
      .onConflictDoUpdate({
        target: serviceCategory.slug,
        set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` },
      })
      .returning({ slug: serviceCategory.slug });

    console.log(`${rows.length} categorias gravadas em service_category.`);

    for (const city of preloadedCities) {
      const { state, cityKey, neighborhoods } = city;
      await db.transaction(async (tx) => {
        await tx
          .insert(geoPlace)
          .values(
            neighborhoods.map(({ name, lat, lng }) => ({
              state,
              city: city.city,
              cityKey,
              neighborhood: name,
              neighborhoodKey: neighborhoodKey(name),
              origin: "osm" as const,
              lat,
              lng,
            })),
          )
          .onConflictDoUpdate({
            target: [geoPlace.state, geoPlace.cityKey, geoPlace.neighborhoodKey],
            set: {
              neighborhood: sql`excluded.neighborhood`,
              lat: sql`excluded.lat`,
              lng: sql`excluded.lng`,
              origin: sql`excluded.origin`,
              updatedAt: new Date(),
            },
          });
        await tx
          .insert(geoCity)
          .values({
            state,
            cityKey,
            city: city.city,
            ibgeCode: city.ibgeCode,
            neighborhoodsLoadedAt: new Date(),
            neighborhoodCount: neighborhoods.length,
          })
          .onConflictDoNothing();
      });
      console.log(
        `${city.city}/${state}: ${neighborhoods.length} bairros gravados sem consultar o mapa.`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
