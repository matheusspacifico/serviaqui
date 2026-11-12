# Segurança das senhas (AT06)

Registro de como o ServiAqui armazena senhas e por que isso atende à AT06.
Conferido com Better Auth 1.7.2 em 12/11/2026.

## Requisito

O documento de cronograma não está no repositório. No `docs/roadmap.md`, a atividade aparece como:

> T1.3 Registrar que o hash do Better Auth (scrypt) atende ao requisito — AT06

A AT06 pede que a senha seja armazenada com hash seguro e não fixa um algoritmo (confirmado com o autor do cronograma). Por isso foi mantido o padrão do Better Auth, sem código próprio de hash.

> Pendente: colar aqui o texto literal da AT06 quando o cronograma estiver à mão.

## Como a senha é armazenada

O Better Auth 1.7.2 usa `hashPassword` de `@better-auth/utils` (`dist/password.node.mjs`). O `src/lib/auth.ts` não configura nada sobre hash.

- Algoritmo: scrypt, pela função `scrypt` do `node:crypto`.
- Parâmetros: `N = 16384` (2^14), `r = 16`, `p = 1`, chave derivada de 64 bytes.
- Salt: 16 bytes aleatórios (`randomBytes(16)`) por senha.
- A senha é normalizada em NFKC antes do hash.
- O valor fica em `account.password`, no formato `salt:hash`, os dois em hexadecimal (32 + 1 + 128 caracteres).
- A senha em texto puro não é gravada no banco nem logada pela aplicação.

## Por que atende

- scrypt é uma função de derivação de chave com custo de memória, feita para encarecer ataques de força bruta com GPU/ASIC.
- Cada senha tem salt próprio, então senhas iguais geram hashes diferentes e tabelas pré-computadas não servem.
- scrypt está entre os algoritmos aceitos pelo [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), que o indica quando o Argon2id não está disponível.

### Limitação conhecida: parâmetros abaixo do mínimo do OWASP

Os parâmetros do Better Auth **não** alcançam as configurações mínimas listadas pelo OWASP (consulta em 12/11/2026):

| Configuração | N | r | p | Memória por hash (128 · N · r) |
|---|---|---|---|---|
| Better Auth 1.7.2 | 2^14 | 16 | 1 | 32 MiB |
| OWASP | 2^17 | 8 | 1 | 128 MiB |
| OWASP | 2^16 | 8 | 2 | 64 MiB |
| OWASP | 2^15 | 8 | 3 | 32 MiB |
| OWASP | 2^14 | 8 | 5 | 16 MiB |
| OWASP | 2^13 | 8 | 10 | 8 MiB |

A linha do OWASP com a mesma memória (32 MiB) pede `p = 3`; o Better Auth usa `p = 1`, cerca de um terço do trabalho. Para o requisito da AT06 (senha com hash seguro), algoritmo adequado e salt único por senha bastam, e a diferença fica registrada aqui como limitação.

## Evidência

1. `pnpm db:up && pnpm db:push && pnpm dev`.
2. Criar uma conta em `/sign-up`.
3. `pnpm db:studio`, abrir a tabela `account` e localizar a linha da conta (`provider_id = credential`).
4. Conferir que `password` tem o formato `salt:hash` em hexadecimal e não contém a senha digitada.

Exemplo de uma conta de teste (banco local, senha `senha-teste-2`):

```
8d531cf984b289cf943bf11cd687020e:ae8cce577c9d8dbaf5c9b009f3e659a4904e3619d96ff09f51da3e0bce3f16d3f13dd2a2f042827ba5498fb80928351b4d98dc406069eb8c6cabae8aeeef4931
```

O mesmo passo está no roteiro de teste como CT-07 (`docs/testes/autenticacao.md`).

## Política de senha

Mínimo de 8 e máximo de 128 caracteres. As constantes `PASSWORD_MIN` e `PASSWORD_MAX` ficam em `src/lib/auth-validation.ts` e são usadas tanto na validação do formulário quanto na configuração do Better Auth (`minPasswordLength`, `maxPasswordLength`).

## Alternativa considerada

Argon2id é a primeira recomendação do OWASP. Não foi adotado porque exigiria um pacote nativo e funções próprias de hash e verificação. Se um dia for necessário (ou para subir os parâmetros do scrypt), o ponto de extensão é `emailAndPassword.password.{ hash, verify }` em `src/lib/auth.ts`. As senhas já gravadas teriam que continuar verificáveis com os parâmetros atuais até o próximo login de cada usuário.

## Sessões

Redefinir a senha revoga todas as sessões do usuário, em qualquer navegador (`revokeSessionsOnPasswordReset: true` em `src/lib/auth.ts`).
