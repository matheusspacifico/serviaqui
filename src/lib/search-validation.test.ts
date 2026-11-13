import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SEARCH_MESSAGES,
  parseCoordinatesInput,
  parseSearchInput,
  type SearchInput,
} from "./search-validation";

const COORDS_ORIGIN = {
  kind: "coords",
  lat: -23.55052,
  lng: -46.63338,
  radiusKm: 5,
} as const;

function errorsOf(input: unknown) {
  const result = parseSearchInput(input as SearchInput);
  assert.equal(result.ok, false);
  return result.ok ? {} : result.fieldErrors;
}

function dataOf(input: unknown) {
  const result = parseSearchInput(input as SearchInput);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("entrada deveria ser válida");
  return result.data;
}

describe("parseSearchInput", () => {
  it("aceita origem por coordenadas e arredonda", () => {
    const data = dataOf({
      category: "eletricista",
      sort: "distancia",
      origin: COORDS_ORIGIN,
    });
    assert.deepEqual(data, {
      category: "eletricista",
      sort: "distancia",
      origin: { kind: "coords", lat: -23.551, lng: -46.633, radiusKm: 5 },
    });
  });

  it("aceita origem por bairro sem coordenadas", () => {
    const data = dataOf({
      category: "eletricista",
      sort: "avaliacao",
      origin: { kind: "place", placeId: "abc" },
    });
    assert.deepEqual(data.origin, { kind: "place", placeId: "abc", coords: null });
  });

  it("aceita origem por bairro com coordenadas", () => {
    const data = dataOf({
      category: "eletricista",
      sort: "distancia",
      origin: {
        kind: "place",
        placeId: "abc",
        coords: { lat: -23.55052, lng: -46.63338 },
      },
    });
    assert.deepEqual(data.origin, {
      kind: "place",
      placeId: "abc",
      coords: { lat: -23.551, lng: -46.633 },
    });
  });

  it("ignora coordenadas inválidas na origem por bairro", () => {
    const data = dataOf({
      category: "eletricista",
      sort: "distancia",
      origin: { kind: "place", placeId: "abc", coords: { lat: 200, lng: "x" } },
    });
    assert.deepEqual(data.origin, { kind: "place", placeId: "abc", coords: null });
  });

  it("recusa raio fora da lista", () => {
    const errors = errorsOf({
      category: "eletricista",
      sort: "distancia",
      origin: { ...COORDS_ORIGIN, radiusKm: 7 },
    });
    assert.deepEqual(errors, { radiusKm: SEARCH_MESSAGES.radiusKm });
  });

  it("recusa ordenação desconhecida", () => {
    const errors = errorsOf({
      category: "eletricista",
      sort: "preco",
      origin: COORDS_ORIGIN,
    });
    assert.deepEqual(errors, { sort: SEARCH_MESSAGES.sort });
  });

  it("recusa serviço vazio ou longo demais", () => {
    const base = { sort: "distancia", origin: COORDS_ORIGIN };
    assert.equal(errorsOf({ ...base, category: " " }).category, SEARCH_MESSAGES.category);
    assert.equal(
      errorsOf({ ...base, category: "a".repeat(61) }).category,
      SEARCH_MESSAGES.category,
    );
  });

  it("recusa placeId vazio ou longo demais", () => {
    const base = { category: "eletricista", sort: "distancia" };
    assert.deepEqual(errorsOf({ ...base, origin: { kind: "place", placeId: "" } }), {
      place: SEARCH_MESSAGES.place,
    });
    assert.deepEqual(
      errorsOf({ ...base, origin: { kind: "place", placeId: "a".repeat(65) } }),
      { place: SEARCH_MESSAGES.place },
    );
  });

  it("recusa coordenadas como string ou fora da faixa", () => {
    const base = { category: "eletricista", sort: "distancia" };
    assert.deepEqual(
      errorsOf({ ...base, origin: { ...COORDS_ORIGIN, lat: "-23.5" } }),
      { origin: SEARCH_MESSAGES.origin },
    );
    assert.deepEqual(errorsOf({ ...base, origin: { ...COORDS_ORIGIN, lat: 91 } }), {
      origin: SEARCH_MESSAGES.origin,
    });
  });

  it("recusa origem ausente ou de formato desconhecido", () => {
    const base = { category: "eletricista", sort: "distancia" };
    assert.deepEqual(errorsOf(base), { origin: SEARCH_MESSAGES.origin });
    assert.deepEqual(errorsOf({ ...base, origin: { kind: "cep" } }), {
      origin: SEARCH_MESSAGES.origin,
    });
    assert.deepEqual(errorsOf({ ...base, origin: "aqui" }), {
      origin: SEARCH_MESSAGES.origin,
    });
  });

  it("não lança com tipos errados em cada campo", () => {
    assert.deepEqual(errorsOf(null), {
      category: SEARCH_MESSAGES.category,
      sort: SEARCH_MESSAGES.sort,
      origin: SEARCH_MESSAGES.origin,
    });
    assert.deepEqual(errorsOf("texto"), errorsOf(undefined));
    const errors = errorsOf({
      category: 42,
      sort: ["distancia"],
      origin: { kind: "coords", lat: {}, lng: [], radiusKm: "5" },
    });
    assert.deepEqual(errors, {
      category: SEARCH_MESSAGES.category,
      sort: SEARCH_MESSAGES.sort,
      origin: SEARCH_MESSAGES.origin,
      radiusKm: SEARCH_MESSAGES.radiusKm,
    });
    assert.deepEqual(
      errorsOf({
        category: "eletricista",
        sort: "distancia",
        origin: { kind: "place", placeId: 12 },
      }),
      { place: SEARCH_MESSAGES.place },
    );
  });
});

describe("parseCoordinatesInput", () => {
  it("aceita e arredonda coordenadas válidas", () => {
    assert.deepEqual(parseCoordinatesInput({ lat: -22.89204, lng: -47.04896 }), {
      ok: true,
      coords: { lat: -22.892, lng: -47.049 },
    });
  });

  it("recusa null, objeto incompleto e valores fora da faixa", () => {
    assert.deepEqual(parseCoordinatesInput(null), { ok: false });
    assert.deepEqual(parseCoordinatesInput({ lat: -22.9 }), { ok: false });
    assert.deepEqual(parseCoordinatesInput({ lat: -91, lng: 0 }), { ok: false });
    assert.deepEqual(parseCoordinatesInput({ lat: 0, lng: 181 }), { ok: false });
    assert.deepEqual(parseCoordinatesInput("x"), { ok: false });
  });
});
