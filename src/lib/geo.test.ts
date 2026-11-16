import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KM_PER_DEGREE,
  boundingBox,
  formatDistance,
  haversineKm,
  isValidCoordinates,
  roundCoordinates,
} from "./geo";

const SE = { lat: -23.5505, lng: -46.6333 };
const MASP = { lat: -23.5614, lng: -46.6559 };

function near(actual: number, expected: number, tolerance: number) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} deveria estar a até ${tolerance} de ${expected}`,
  );
}

describe("haversineKm", () => {
  it("dá zero para o mesmo ponto", () => {
    assert.equal(haversineKm(SE, SE), 0);
  });

  it("calcula uma distância conhecida", () => {
    near(haversineKm(SE, MASP), 2.6, 0.1);
  });

  it("é simétrica", () => {
    assert.equal(haversineKm(SE, MASP), haversineKm(MASP, SE));
  });

  it("não devolve NaN em pontos antípodas", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    assert.ok(Number.isFinite(d));
  });
});

describe("boundingBox", () => {
  const radius = 5;
  const box = boundingBox(SE, radius);

  it("contém o centro", () => {
    assert.ok(box.minLat < SE.lat && SE.lat < box.maxLat);
    assert.ok(box.minLng < SE.lng && SE.lng < box.maxLng);
  });

  it("tem a borda norte a r km do centro", () => {
    near(haversineKm(SE, { lat: box.maxLat, lng: SE.lng }), radius, radius * 0.01);
  });

  it("tem a borda leste a r km do centro", () => {
    near(haversineKm(SE, { lat: SE.lat, lng: box.maxLng }), radius, radius * 0.01);
  });

  it("usa 111,32 km por grau de latitude", () => {
    near(box.maxLat - SE.lat, radius / KM_PER_DEGREE, 1e-12);
  });
});

describe("formatDistance", () => {
  it("formata metros, com mínimo de 100", () => {
    assert.equal(formatDistance(0), "≈ 100 m");
    assert.equal(formatDistance(0.04), "≈ 100 m");
    assert.equal(formatDistance(0.34), "≈ 300 m");
  });

  it("formata quilômetros com uma casa e vírgula", () => {
    assert.equal(formatDistance(1), "≈ 1,0 km");
    assert.equal(formatDistance(2.34), "≈ 2,3 km");
  });

  it("formata acima de 10 km como inteiro", () => {
    assert.equal(formatDistance(14.6), "≈ 15 km");
  });

  it("não mostra 1000 m nem 10,0 km nas viradas de faixa", () => {
    assert.equal(formatDistance(0.97), "≈ 1,0 km");
    assert.equal(formatDistance(9.97), "≈ 10 km");
  });
});

describe("roundCoordinates", () => {
  it("arredonda para 3 casas", () => {
    assert.deepEqual(roundCoordinates({ lat: -23.55052, lng: -46.63338 }), {
      lat: -23.551,
      lng: -46.633,
    });
  });
});

describe("isValidCoordinates", () => {
  it("aceita coordenadas dentro da faixa", () => {
    assert.equal(isValidCoordinates(SE), true);
    assert.equal(isValidCoordinates({ lat: 90, lng: -180 }), true);
  });

  it("recusa valores fora da faixa ou de outro tipo", () => {
    assert.equal(isValidCoordinates({ lat: NaN, lng: 0 }), false);
    assert.equal(isValidCoordinates({ lat: "1", lng: 0 }), false);
    assert.equal(isValidCoordinates({ lat: 91, lng: 0 }), false);
    assert.equal(isValidCoordinates({ lat: 0, lng: -181 }), false);
    assert.equal(isValidCoordinates({ lat: Infinity, lng: 0 }), false);
    assert.equal(isValidCoordinates(null), false);
    assert.equal(isValidCoordinates("x"), false);
    assert.equal(isValidCoordinates({ lat: 1 }), false);
  });
});
