import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatHourlyRate,
  formatPhone,
  formatPhoneInput,
  neighborhoodKey,
  normalizePhone,
  parseHourlyRate,
  parseProviderProfile,
  type ProviderProfileInput,
} from "./provider-validation";

const RANGE_ERROR = "O valor precisa ficar entre R$ 1,00 e R$ 1.000,00.";
const FORMAT_ERROR = "Digite um valor como 80 ou 80,00.";
const COMMA_ERROR = "Use vírgula para os centavos, como 80,50.";

function validInput(
  overrides: Partial<ProviderProfileInput> = {},
): ProviderProfileInput {
  return {
    displayName: "Ana Souza",
    phone: "(11) 91234-5678",
    phoneIsWhatsapp: true,
    city: "São Paulo",
    state: "SP",
    categories: ["eletricista"],
    neighborhoods: ["Centro"],
    hourlyRate: "",
    description: "",
    ...overrides,
  };
}

function errorsOf(input: unknown) {
  const result = parseProviderProfile(input as ProviderProfileInput);
  assert.equal(result.ok, false);
  return result.ok ? {} : result.fieldErrors;
}

describe("normalizePhone", () => {
  it("aceita celular com e sem máscara", () => {
    assert.equal(normalizePhone("(11) 91234-5678"), "11912345678");
    assert.equal(normalizePhone("11912345678"), "11912345678");
  });

  it("descarta o 55 do começo", () => {
    assert.equal(normalizePhone("+55 11 91234-5678"), "11912345678");
    assert.equal(normalizePhone("55 11 3123-4567"), "1131234567");
  });

  it("aceita fixo de 10 dígitos", () => {
    assert.equal(normalizePhone("(11) 3123-4567"), "1131234567");
  });

  it("mantém o DDD 55 quando o número já está completo", () => {
    assert.equal(normalizePhone("(55) 99123-4567"), "55991234567");
  });

  it("recusa celular de 11 dígitos sem o 9", () => {
    assert.equal(normalizePhone("(11) 81234-5678"), null);
  });

  it("recusa DDD com zero", () => {
    assert.equal(normalizePhone("(01) 91234-5678"), null);
    assert.equal(normalizePhone("(10) 91234-5678"), null);
  });

  it("recusa curto demais e vazio", () => {
    assert.equal(normalizePhone("1234"), null);
    assert.equal(normalizePhone(""), null);
  });
});

describe("parseHourlyRate", () => {
  it("vazio vira null", () => {
    assert.deepEqual(parseHourlyRate(""), { cents: null });
    assert.deepEqual(parseHourlyRate("  "), { cents: null });
  });

  it("converte para centavos", () => {
    assert.deepEqual(parseHourlyRate("80"), { cents: 8000 });
    assert.deepEqual(parseHourlyRate("80,5"), { cents: 8050 });
    assert.deepEqual(parseHourlyRate("80,50"), { cents: 8050 });
    assert.deepEqual(parseHourlyRate("R$ 80"), { cents: 8000 });
  });

  it("aceita os limites da faixa", () => {
    assert.deepEqual(parseHourlyRate("1"), { cents: 100 });
    assert.deepEqual(parseHourlyRate("1.000,00"), { cents: 100_000 });
  });

  it("recusa fora da faixa", () => {
    assert.deepEqual(parseHourlyRate("0,99"), { error: RANGE_ERROR });
    assert.deepEqual(parseHourlyRate("1.000,01"), { error: RANGE_ERROR });
    assert.deepEqual(parseHourlyRate("1.200,00"), { error: RANGE_ERROR });
  });

  it("recusa ponto como separador decimal", () => {
    assert.deepEqual(parseHourlyRate("80.50"), { error: COMMA_ERROR });
  });

  it("recusa texto e formatos quebrados", () => {
    assert.deepEqual(parseHourlyRate("abc"), { error: FORMAT_ERROR });
    assert.deepEqual(parseHourlyRate("80,123"), { error: FORMAT_ERROR });
    assert.deepEqual(parseHourlyRate("-80"), { error: FORMAT_ERROR });
    assert.deepEqual(parseHourlyRate("1.00,00"), { error: FORMAT_ERROR });
  });
});

describe("neighborhoodKey", () => {
  it("ignora acentos, caixa e espaços repetidos", () => {
    assert.equal(neighborhoodKey("São José"), "sao jose");
    assert.equal(neighborhoodKey("  SÃO   JOSÉ "), "sao jose");
    assert.equal(neighborhoodKey("sao jose"), "sao jose");
  });
});

describe("parseProviderProfile", () => {
  it("aceita a entrada válida mínima", () => {
    const result = parseProviderProfile(validInput());
    assert.deepEqual(result, {
      ok: true,
      data: {
        displayName: "Ana Souza",
        phone: "11912345678",
        phoneIsWhatsapp: true,
        city: "São Paulo",
        state: "SP",
        categories: ["eletricista"],
        neighborhoods: [{ name: "Centro", key: "centro" }],
        hourlyRateCents: null,
        description: null,
      },
    });
  });

  it("aponta todos os obrigatórios vazios", () => {
    const errors = errorsOf(
      validInput({
        displayName: " ",
        phone: "",
        city: "",
        state: "",
        categories: [],
        neighborhoods: [],
      }),
    );
    assert.deepEqual(Object.keys(errors).sort(), [
      "categories",
      "city",
      "displayName",
      "neighborhoods",
      "phone",
      "state",
    ]);
  });

  it("exige ao menos um serviço e no máximo cinco", () => {
    assert.equal(
      errorsOf(validInput({ categories: [] })).categories,
      "Escolha pelo menos um serviço.",
    );
    assert.equal(
      errorsOf(
        validInput({ categories: ["a", "b", "c", "d", "e", "f"] }),
      ).categories,
      "Escolha no máximo 5 serviços.",
    );
  });

  it("remove slugs repetidos antes de contar", () => {
    const result = parseProviderProfile(
      validInput({
        categories: ["a", "a", "b", "b", "c", "c", "d", "e"],
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data.categories, ["a", "b", "c", "d", "e"]);
    }
  });

  it("recusa slug fora do formato", () => {
    assert.equal(
      errorsOf(validInput({ categories: ["Eletricista!"] })).categories,
      "Escolha serviços da lista.",
    );
  });

  it("junta bairros repetidos pela chave e mantém o primeiro digitado", () => {
    const result = parseProviderProfile(
      validInput({ neighborhoods: ["São  José", "sao jose", " Centro "] }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data.neighborhoods, [
        { name: "São José", key: "sao jose" },
        { name: "Centro", key: "centro" },
      ]);
    }
  });

  it("limita a 10 bairros e valida o tamanho de cada um", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Bairro ${i + 1}`);
    assert.equal(
      errorsOf(validInput({ neighborhoods: eleven })).neighborhoods,
      "Adicione no máximo 10 bairros.",
    );
    assert.equal(
      errorsOf(validInput({ neighborhoods: ["A"] })).neighborhoods,
      "Cada bairro precisa ter entre 2 e 60 caracteres.",
    );
    assert.equal(
      errorsOf(validInput({ neighborhoods: ["  ", ""] })).neighborhoods,
      "Adicione pelo menos um bairro.",
    );
  });

  it("limita a descrição a 500 caracteres depois do trim", () => {
    assert.equal(
      errorsOf(validInput({ description: "a".repeat(501) })).description,
      "A descrição pode ter no máximo 500 caracteres.",
    );
    const padded = parseProviderProfile(
      validInput({ description: `  ${"a".repeat(500)}  ` }),
    );
    assert.equal(padded.ok, true);
  });

  it("descrição só com espaços vira null", () => {
    const result = parseProviderProfile(validInput({ description: "   \n " }));
    assert.equal(result.ok && result.data.description, null);
  });

  it("valida nome, cidade e UF", () => {
    assert.equal(
      errorsOf(validInput({ displayName: "A" })).displayName,
      "O nome precisa ter entre 2 e 80 caracteres.",
    );
    assert.equal(
      errorsOf(validInput({ city: "a".repeat(81) })).city,
      "A cidade precisa ter entre 2 e 80 caracteres.",
    );
    assert.equal(
      errorsOf(validInput({ state: "XX" })).state,
      "Escolha o estado.",
    );
  });

  it("repassa o erro do valor por hora", () => {
    assert.equal(
      errorsOf(validInput({ hourlyRate: "80.50" })).hourlyRate,
      COMMA_ERROR,
    );
  });

  it("devolve erro de campo, sem lançar, quando o tipo vem errado", () => {
    const errors = errorsOf({
      ...validInput(),
      displayName: 42,
      phone: null,
      categories: "eletricista",
      neighborhoods: [1, 2],
      hourlyRate: 80,
      description: {},
    });
    assert.deepEqual(Object.keys(errors).sort(), [
      "categories",
      "description",
      "displayName",
      "hourlyRate",
      "neighborhoods",
      "phone",
    ]);
  });

  it("não lança quando a entrada não é um objeto", () => {
    for (const input of [null, undefined, "texto", 7, []]) {
      assert.equal(parseProviderProfile(input as never).ok, false);
    }
  });
});

describe("formatadores", () => {
  it("formatPhone", () => {
    assert.equal(formatPhone("11912345678"), "(11) 91234-5678");
    assert.equal(formatPhone("1131234567"), "(11) 3123-4567");
  });

  it("formatPhoneInput formata enquanto digita e permite apagar", () => {
    assert.equal(formatPhoneInput("1"), "1");
    assert.equal(formatPhoneInput("119"), "(11) 9");
    assert.equal(formatPhoneInput("(11) "), "11");
    assert.equal(formatPhoneInput("11912345678"), "(11) 91234-5678");
    assert.equal(formatPhoneInput("119123456789"), "(11) 91234-5678");
    assert.equal(formatPhoneInput("5511912345678"), "(11) 91234-5678");
    assert.equal(formatPhoneInput("+55 11 91234-5678"), "+55 11 91234-5678");
  });

  it("formatHourlyRate", () => {
    assert.equal(formatHourlyRate(null), "Valor a combinar");
    assert.equal(formatHourlyRate(8000), "R$ 80,00/h");
    assert.equal(formatHourlyRate(8050), "R$ 80,50/h");
    assert.equal(formatHourlyRate(100_000), "R$ 1.000,00/h");
  });
});
