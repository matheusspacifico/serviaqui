import { and, eq, inArray, like, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { findMunicipality } from "@/lib/municipalities";
import { neighborhoodKey } from "@/lib/provider-validation";
import {
  geoCity,
  geoPlace,
  providerArea,
  providerProfile,
  providerService,
  user,
} from "./schema";

type DemoPlace = { neighborhood: string; lat: number; lng: number };

const STATE = "SP";
const MISSING_FROM_MAP = "Jardim Inexistente";

const CITIES: { cityKey: string; places: DemoPlace[] }[] = [
  {
    cityKey: "sao paulo",
    places: [
      { neighborhood: "Sé", lat: -23.5505, lng: -46.6333 },
      { neighborhood: "Bela Vista", lat: -23.5614, lng: -46.6559 },
      { neighborhood: "Pinheiros", lat: -23.567, lng: -46.702 },
      { neighborhood: "Vila Mariana", lat: -23.5892, lng: -46.6344 },
      { neighborhood: "Mooca", lat: -23.5606, lng: -46.5997 },
      { neighborhood: "Tatuapé", lat: -23.5403, lng: -46.5766 },
      { neighborhood: "Santana", lat: -23.5016, lng: -46.6258 },
      { neighborhood: "Lapa", lat: -23.5275, lng: -46.7044 },
      { neighborhood: "Santo Amaro", lat: -23.6522, lng: -46.7108 },
      { neighborhood: "Itaquera", lat: -23.536, lng: -46.4555 },
      { neighborhood: "Liberdade", lat: -23.5596, lng: -46.6328 },
      { neighborhood: "Consolação", lat: -23.553, lng: -46.659 },
      { neighborhood: "Butantã", lat: -23.5717, lng: -46.7081 },
    ],
  },
  {
    cityKey: "campinas",
    places: [
      { neighborhood: "Centro", lat: -22.9056, lng: -47.0608 },
      { neighborhood: "Cambuí", lat: -22.892, lng: -47.049 },
      { neighborhood: "Taquaral", lat: -22.874, lng: -47.05 },
    ],
  },
];

type DemoProvider = {
  name: string;
  cityKey: string;
  services: string[];
  areas: string[];
  hourlyRateCents: number | null;
  description: string;
};

const PROVIDERS: DemoProvider[] = [
  {
    name: "Carlos Elétrica",
    cityKey: "sao paulo",
    services: ["eletricista"],
    areas: ["Sé", "Bela Vista"],
    hourlyRateCents: 9000,
    description: "Instalações e reparos elétricos residenciais.",
  },
  {
    name: "Marina Souza",
    cityKey: "sao paulo",
    services: ["eletricista", "ar-condicionado"],
    areas: ["Pinheiros"],
    hourlyRateCents: 12000,
    description: "Eletricista e instaladora de ar-condicionado.",
  },
  {
    name: "Eletro Mooca",
    cityKey: "sao paulo",
    services: ["eletricista"],
    areas: ["Mooca"],
    hourlyRateCents: 8000,
    description: "Quadros de luz, tomadas e chuveiros.",
  },
  {
    name: "João Pereira",
    cityKey: "sao paulo",
    services: ["eletricista", "encanador"],
    areas: ["Vila Mariana"],
    hourlyRateCents: null,
    description: "Pequenos reparos de elétrica e hidráulica.",
  },
  {
    name: "Tatuapé Instalações",
    cityKey: "sao paulo",
    services: ["eletricista"],
    areas: ["Tatuapé", "Itaquera"],
    hourlyRateCents: 10000,
    description: "Instalações elétricas na zona leste.",
  },
  {
    name: "Val Reparos",
    cityKey: "sao paulo",
    services: ["encanador", "pedreiro"],
    areas: ["Santana", "Lapa"],
    hourlyRateCents: 7000,
    description: "Vazamentos, reformas pequenas e acabamento.",
  },
  {
    name: "Dona Cida Limpeza",
    cityKey: "sao paulo",
    services: ["diarista"],
    areas: ["Bela Vista"],
    hourlyRateCents: 4000,
    description: "Faxina completa de casas e apartamentos.",
  },
  {
    name: "Rosa Almeida",
    cityKey: "sao paulo",
    services: ["diarista"],
    areas: ["Bela Vista"],
    hourlyRateCents: 3500,
    description: "Diarista com experiência em apartamentos.",
  },
  {
    name: "Chaveiro Itaquera 24h",
    cityKey: "sao paulo",
    services: ["chaveiro"],
    areas: ["Itaquera"],
    hourlyRateCents: 6000,
    description: "Abertura de portas e cópias de chaves.",
  },
  {
    name: "Pinturas Santo Amaro",
    cityKey: "sao paulo",
    services: ["pintor"],
    areas: ["Santo Amaro"],
    hourlyRateCents: 5500,
    description: "Pintura interna e externa.",
  },
  {
    name: "Lapa Jardins",
    cityKey: "sao paulo",
    services: ["jardineiro"],
    areas: ["Lapa"],
    hourlyRateCents: 5000,
    description: "Manutenção de jardins e podas.",
  },
  {
    name: "Bruno Montador",
    cityKey: "sao paulo",
    services: ["montador-de-moveis"],
    areas: [MISSING_FROM_MAP],
    hourlyRateCents: 4500,
    description: "Montagem e desmontagem de móveis.",
  },
  {
    name: "Campinas Elétrica",
    cityKey: "campinas",
    services: ["eletricista"],
    areas: ["Centro", "Cambuí"],
    hourlyRateCents: 8500,
    description: "Eletricista em Campinas e região central.",
  },
  {
    name: "Lúcia Manicure",
    cityKey: "campinas",
    services: ["manicure"],
    areas: ["Cambuí"],
    hourlyRateCents: 3000,
    description: "Manicure e pedicure em domicílio.",
  },
  {
    name: "Luz & Cia",
    cityKey: "sao paulo",
    services: ["eletricista"],
    areas: ["Sé"],
    hourlyRateCents: 9500,
    description: "Elétrica predial e residencial no centro.",
  },
];

function municipalityOf(cityKey: string) {
  const municipality = findMunicipality(STATE, cityKey);
  if (!municipality) throw new Error(`Município não encontrado: ${cityKey}`);
  return municipality;
}

const number = (index: number) => String(index + 1).padStart(2, "0");

async function main() {
  const clean = process.argv.includes("--clean");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle({ client });
  const cityKeys = CITIES.map((city) => city.cityKey);

  try {
    if (clean) {
      const users = await db
        .delete(user)
        .where(like(user.id, "demo-user-%"))
        .returning({ id: user.id });
      await db
        .delete(geoCity)
        .where(and(eq(geoCity.state, STATE), inArray(geoCity.cityKey, cityKeys)));
      const places = await db
        .delete(geoPlace)
        .where(
          and(
            eq(geoPlace.state, STATE),
            inArray(geoPlace.cityKey, cityKeys),
            notExists(
              db
                .select({ id: providerArea.id })
                .from(providerArea)
                .where(eq(providerArea.placeId, geoPlace.id)),
            ),
          ),
        )
        .returning({ id: geoPlace.id });
      console.log(
        `Removidos ${users.length} prestadores de demonstração e ${places.length} lugares sem uso.`,
      );
      return;
    }

    await db.transaction(async (tx) => {
      const placeIds = new Map<string, string>();

      for (const { cityKey, places } of CITIES) {
        const municipality = municipalityOf(cityKey);
        const rows = [
          ...places.map((place) => ({ ...place, origin: "osm" as const })),
          ...(cityKey === "sao paulo"
            ? [
                {
                  neighborhood: MISSING_FROM_MAP,
                  lat: municipality.lat,
                  lng: municipality.lng,
                  origin: "provider" as const,
                },
              ]
            : []),
        ];
        const saved = await tx
          .insert(geoPlace)
          .values(
            rows.map((row) => ({
              ...row,
              state: STATE,
              city: municipality.name,
              cityKey,
              neighborhoodKey: neighborhoodKey(row.neighborhood),
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
          })
          .returning({ id: geoPlace.id, neighborhood: geoPlace.neighborhood });
        for (const { id, neighborhood } of saved) {
          placeIds.set(`${cityKey}|${neighborhood}`, id);
        }

        const loaded = {
          city: municipality.name,
          ibgeCode: municipality.code,
          neighborhoodsLoadedAt: new Date(),
          neighborhoodCount: places.length,
        };
        await tx
          .insert(geoCity)
          .values({ state: STATE, cityKey, ...loaded })
          .onConflictDoUpdate({
            target: [geoCity.state, geoCity.cityKey],
            set: loaded,
          });
      }

      for (const [index, provider] of PROVIDERS.entries()) {
        const userId = `demo-user-${number(index)}`;
        const providerId = `demo-provider-${number(index)}`;
        const account = {
          name: provider.name,
          email: `demo-${number(index)}@serviaqui.invalid`,
        };
        await tx
          .insert(user)
          .values({ id: userId, emailVerified: false, ...account })
          .onConflictDoUpdate({ target: user.id, set: account });

        const profile = {
          displayName: provider.name,
          phone: `119999900${number(index)}`,
          phoneIsWhatsapp: true,
          city: municipalityOf(provider.cityKey).name,
          state: STATE,
          hourlyRateCents: provider.hourlyRateCents,
          description: provider.description,
        };
        await tx
          .insert(providerProfile)
          .values({ id: providerId, userId, ...profile })
          .onConflictDoUpdate({ target: providerProfile.id, set: profile });

        await tx
          .delete(providerService)
          .where(eq(providerService.providerId, providerId));
        await tx
          .delete(providerArea)
          .where(eq(providerArea.providerId, providerId));
        await tx.insert(providerService).values(
          provider.services.map((categorySlug) => ({ providerId, categorySlug })),
        );
        await tx.insert(providerArea).values(
          provider.areas.map((neighborhood) => {
            const placeId = placeIds.get(`${provider.cityKey}|${neighborhood}`);
            if (!placeId) throw new Error(`Bairro fora do seed: ${neighborhood}`);
            return {
              providerId,
              neighborhood,
              neighborhoodKey: neighborhoodKey(neighborhood),
              placeId,
            };
          }),
        );
      }
    });

    console.log(
      `${PROVIDERS.length} prestadores de demonstração gravados em São Paulo e Campinas.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
