import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serviceCategory } from "./schema";

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
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
