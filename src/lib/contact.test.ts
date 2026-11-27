import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWhatsAppUrl } from "./contact";

describe("buildWhatsAppUrl", () => {
  it("cria link internacional com mensagem pronta e número formatado", () => {
    const url = buildWhatsAppUrl("(11) 91234-5678");
    assert.ok(url);

    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://wa.me");
    assert.equal(parsed.pathname, "/5511912345678");
    assert.equal(
      parsed.searchParams.get("text"),
      "Olá! Vi seu perfil no ServiAqui e gostaria de saber mais sobre seus serviços.",
    );
  });

  it("aceita telefone informado com código do Brasil", () => {
    const url = buildWhatsAppUrl("+55 11 91234-5678");
    assert.ok(url);
    assert.equal(new URL(url).pathname, "/5511912345678");
  });

  it("não cria link para telefone inválido", () => {
    assert.equal(buildWhatsAppUrl("1234"), null);
  });
});
