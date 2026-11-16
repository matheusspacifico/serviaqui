import type { Metadata } from "next";
import { listServiceCategories } from "@/lib/provider-queries";
import { getSearchPlace } from "@/lib/provider-search";
import {
  DEFAULT_RADIUS_KM,
  DEFAULT_SORT,
  SEARCH_LIMITS,
  isSearchRadius,
  isSearchSort,
} from "@/lib/search-validation";
import { SiteHeader } from "@/components/site-header";
import { SearchForm, type SearchFormProps } from "./search-form";

export const metadata: Metadata = { title: "Buscar prestadores | ServiAqui" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function initialPlace(
  placeId: string | undefined,
): Promise<SearchFormProps["initial"]["place"]> {
  if (!placeId || placeId.length > SEARCH_LIMITS.placeIdMax) return null;
  const place = await getSearchPlace(placeId);
  if (!place) return null;
  return {
    placeId: place.placeId,
    neighborhood: place.neighborhood,
    city: { state: place.state, cityKey: place.cityKey, city: place.city },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [categories, place] = await Promise.all([
    listServiceCategories(),
    initialPlace(first(params.local)),
  ]);

  const category = first(params.servico);
  const radius = Number(first(params.raio));
  const sort = first(params.ordem);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <h1 className="text-3xl font-bold">Encontre um prestador</h1>
        {categories.length === 0 ? (
          <p
            role="alert"
            className="rounded-lg bg-warning px-4 py-3 text-sm text-warning-foreground"
          >
            Nenhuma categoria de serviço cadastrada. Rode{" "}
            <code className="font-mono">pnpm db:seed</code> e recarregue a
            página.
          </p>
        ) : (
          <SearchForm
            categories={categories}
            initial={{
              category: categories.some((item) => item.slug === category)
                ? (category ?? "")
                : "",
              radiusKm: isSearchRadius(radius) ? radius : DEFAULT_RADIUS_KM,
              sort: isSearchSort(sort) ? sort : DEFAULT_SORT,
              place,
            }}
          />
        )}
        <p className="mt-auto pt-6 text-xs text-muted-foreground">
          Bairros:{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            © OpenStreetMap
          </a>
        </p>
      </main>
    </>
  );
}
