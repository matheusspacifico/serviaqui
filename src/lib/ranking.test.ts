import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adjustedRating, compareProviders } from "./ranking";
import type { ProviderSearchItem } from "./search-validation";

function provider(
  displayName: string,
  distanceKm: number | null,
  ratingAverage: number | null = null,
  ratingCount = 0,
): ProviderSearchItem {
  return {
    id: displayName,
    displayName,
    hourlyRateCents: null,
    services: [],
    neighborhood: "Centro",
    distanceKm,
    ratingAverage,
    ratingCount,
  };
}

function order(sort: "distancia" | "avaliacao", items: ProviderSearchItem[]) {
  return [...items].sort(compareProviders(sort)).map((item) => item.displayName);
}

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.005, `${actual} ≠ ${expected}`);
}

describe("adjustedRating", () => {
  it("vale 4,0 sem avaliações", () => {
    assert.equal(adjustedRating(null, 0), 4);
    assert.equal(adjustedRating(5, 0), 4);
  });

  it("puxa notas isoladas para a média", () => {
    near(adjustedRating(5, 1), 4.17);
    near(adjustedRating(1, 1), 3.5);
  });

  it("se aproxima da média real com muitas avaliações", () => {
    near(adjustedRating(4.8, 50), 4.73);
  });

  it("trata média nula com contagem positiva como sem avaliações", () => {
    assert.equal(adjustedRating(null, 7), 4);
  });
});

describe('compareProviders("distancia")', () => {
  it("põe o mais perto antes", () => {
    assert.deepEqual(
      order("distancia", [provider("Longe", 4, 5, 100), provider("Perto", 1)]),
      ["Perto", "Longe"],
    );
  });

  it("empata 2,31 e 2,34 km e decide pela nota", () => {
    assert.deepEqual(
      order("distancia", [
        provider("Pior", 2.31, 3, 20),
        provider("Melhor", 2.34, 4.8, 50),
      ]),
      ["Melhor", "Pior"],
    );
  });

  it("decide pelo nome no empate total", () => {
    assert.deepEqual(
      order("distancia", [provider("Bruno", 2), provider("Ana", 2)]),
      ["Ana", "Bruno"],
    );
  });
});

describe('compareProviders("avaliacao")', () => {
  it("põe 4,8 com 50 avaliações antes de 5,0 com 1", () => {
    assert.deepEqual(
      order("avaliacao", [
        provider("Uma nota", 1, 5, 1),
        provider("Muitas notas", 9, 4.8, 50),
      ]),
      ["Muitas notas", "Uma nota"],
    );
  });

  it("põe prestador novo antes de 3,0 com 20 avaliações", () => {
    assert.deepEqual(
      order("avaliacao", [provider("Mal avaliado", 1, 3, 20), provider("Novo", 9)]),
      ["Novo", "Mal avaliado"],
    );
  });

  it("decide pela distância no empate de nota", () => {
    assert.deepEqual(
      order("avaliacao", [provider("Longe", 5), provider("Perto", 2)]),
      ["Perto", "Longe"],
    );
  });
});

describe("itens com a mesma distância", () => {
  const items = [
    provider("Carla", null, 3, 20),
    provider("Bruno", null),
    provider("Ana", null),
    provider("Dora", null, 4.8, 50),
  ];
  const expected = ["Dora", "Ana", "Bruno", "Carla"];

  it("ordena por nota e depois nome nas duas opções", () => {
    assert.deepEqual(order("distancia", items), expected);
    assert.deepEqual(order("avaliacao", items), expected);
  });

  it("vale também com a mesma distância numérica", () => {
    const same = items.map((item) => ({ ...item, distanceKm: 3.2 }));
    assert.deepEqual(order("distancia", same), expected);
    assert.deepEqual(order("avaliacao", same), expected);
  });
});
