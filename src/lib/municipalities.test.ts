import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findMunicipality,
  listMunicipalities,
  nearestMunicipality,
} from "./municipalities";
import { neighborhoodKey } from "./provider-validation";

describe("findMunicipality", () => {
  it("acha a cidade pela chave normalizada", () => {
    const city = findMunicipality("SP", "sao paulo");
    assert.equal(city?.name, "São Paulo");
    assert.equal(city?.code, "3550308");
  });

  it("reconhece grafias com acento e caixa diferentes", () => {
    for (const typed of ["São Paulo", "SAO PAULO", "  são   paulo "]) {
      assert.equal(
        findMunicipality("SP", neighborhoodKey(typed))?.name,
        "São Paulo",
      );
    }
  });

  it("devolve null para cidade inexistente ou de outra UF", () => {
    assert.equal(findMunicipality("SP", "campnas"), null);
    assert.equal(findMunicipality("RJ", "campinas"), null);
    assert.equal(findMunicipality("XX", "campinas"), null);
  });
});

describe("nearestMunicipality", () => {
  it("acha São Paulo a partir da Sé", () => {
    assert.equal(
      nearestMunicipality({ lat: -23.5505, lng: -46.6333 })?.name,
      "São Paulo",
    );
  });

  it("acha Campinas a partir do Cambuí", () => {
    assert.equal(
      nearestMunicipality({ lat: -22.892, lng: -47.049 })?.name,
      "Campinas",
    );
  });

  it("devolve null no meio do Atlântico", () => {
    assert.equal(nearestMunicipality({ lat: -25, lng: -20 }), null);
  });
});

describe("listMunicipalities", () => {
  const cities = listMunicipalities("SP");

  it("lista as 645 cidades de SP, só de SP", () => {
    assert.equal(cities.length, 645);
    assert.ok(cities.every((city) => city.state === "SP"));
    assert.ok(cities.some((city) => city.cityKey === "campinas"));
    assert.ok(!cities.some((city) => city.city === "Rio de Janeiro"));
  });

  it("vem em ordem alfabética", () => {
    const names = cities.map((city) => city.city);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
    assert.deepEqual(names, sorted);
  });

  it("devolve lista vazia para UF desconhecida", () => {
    assert.deepEqual(listMunicipalities("XX"), []);
  });
});
