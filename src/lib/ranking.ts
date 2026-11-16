import type { ProviderSearchItem, SearchSort } from "./search-validation";

export const RATING_PRIOR_MEAN = 4.0;
export const RATING_PRIOR_WEIGHT = 5;

export function adjustedRating(average: number | null, count: number): number {
  const n = average === null || count <= 0 ? 0 : count;
  return (
    (RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN + (average ?? 0) * n) /
    (RATING_PRIOR_WEIGHT + n)
  );
}

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

export function compareProviders(
  sort: SearchSort,
): (a: ProviderSearchItem, b: ProviderSearchItem) => number {
  return (a, b) => {
    const ratingA = adjustedRating(a.ratingAverage, a.ratingCount);
    const ratingB = adjustedRating(b.ratingAverage, b.ratingCount);
    const distanceA = a.distanceKm ?? 0;
    const distanceB = b.distanceKm ?? 0;
    const byName = a.displayName.localeCompare(b.displayName, "pt-BR");

    if (sort === "avaliacao") {
      return (
        round(ratingB, 2) - round(ratingA, 2) || distanceA - distanceB || byName
      );
    }
    return round(distanceA, 1) - round(distanceB, 1) || ratingB - ratingA || byName;
  };
}
