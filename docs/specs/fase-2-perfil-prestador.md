# Spec — Fase 2: Perfil do prestador (pacote 1.1)

Cobre as tasks T2.1 a T2.7 do `docs/roadmap.md` (atividades AT01, AT02 e AT03).

O documento de cronograma não está no repositório; o texto das ATs foi inferido do roadmap. O formato do cadastro, a cidade no perfil, o valor/hora opcional e os testes unitários não estavam definidos no roadmap; as decisões abaixo foram confirmadas com o autor.

## Situação atual

- Só existem as tabelas do Better Auth (`user`, `session`, `account`, `verification`). Nenhuma tabela da aplicação.
- Não há distinção entre cliente e prestador: toda conta é igual.
- `/dashboard` é a única rota logada e mostra apenas o e-mail da conta. O `matcher` do proxy já cobre `/dashboard/:path*`.
- Não há nenhuma server action no projeto; os formulários de auth chamam o `authClient` no browser.
- `FormField` só embrulha `Input`. Não há componente para textarea com rótulo/erro, seleção múltipla nem lista de etiquetas.
- Não há script de seed nem executor de TypeScript fora do Next (`tsx` não está instalado), nem framework de teste.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Quem é prestador | Qualquer conta que tenha uma linha em `provider_profile` (1:1 com `user`). Sem coluna de papel no `user` | Não mexe nas tabelas geradas pelo Better Auth; a mesma pessoa pode contratar e prestar serviço |
| Formato do cadastro (T2.5) | Formulário em uma única tela, dividido em três blocos visuais. Nem etapas, nem chat | São 5 campos obrigatórios; etapas somam cliques e o chat soma espera, e a T6.1 exige criar o perfil em menos de 30 s |
| Criar e editar | Mesma rota (`/dashboard/prestador`) e mesma server action (upsert pelo usuário da sessão) | Um perfil por conta; não há motivo para dois fluxos |
| Cidade | `city` e `state` (UF) no perfil; os bairros pertencem a essa cidade | "Centro" sozinho não é geocodificável na T3.2 |
| Bairros | Texto livre, de 1 a 10 por perfil, em `provider_area`, com uma chave normalizada (sem acento, minúscula) para deduplicar e buscar | O roadmap não prevê tabela de bairros; a T3.2 acrescenta lat/lng nessa mesma tabela |
| Serviços | De 1 a 5 categorias escolhidas de `service_category` (seed). Sem texto livre | A busca da Fase 3 filtra por serviço; texto livre não é filtrável |
| Telefone | Um número só, guardado apenas com dígitos (DDD + número), mais o booleano `phone_is_whatsapp` | A Fase 4 monta `wa.me` e `tel:` a partir dele; uma coluna só facilita a criptografia da T6.3 |
| Valor/hora | Opcional, inteiro em centavos. Vazio aparece como "Valor a combinar" | Nem todo serviço é cobrado por hora; centavos evitam erro de ponto flutuante |
| Descrição | Opcional, até 500 caracteres | Ajuda a meta de 30 s |
| Telefone na página pública | **Não** é exibido nem consultado em `/prestador/[id]` nesta fase | O contato entra na Fase 4 por botões que registram o evento (T4.3); expor o número agora cria um caminho que não passa por eles |
| Identificadores | `text` com `crypto.randomUUID()`. A URL pública usa o `id` do perfil, não o do usuário. Categoria usa o `slug` como chave primária | Mesmo tipo das tabelas do Better Auth; não expõe o id da conta; seed legível e idempotente |
| Validação | Validadores à mão em `src/lib/provider-validation.ts`, usados no cliente e na server action | Mesma decisão da Fase 1 (sem `zod`); uma única fonte para regras e mensagens |
| Chamada da server action | Chamada direta no `onSubmit` (dentro de `useTransition`), recebendo um objeto e devolvendo um resultado tipado. Sem `useActionState`/`FormData` | Mantém o padrão dos formulários de auth (erros por campo, foco no primeiro inválido) e permite toast + navegação no cliente. O formulário já depende de JS por causa das etiquetas de bairro |
| Seed | `src/db/seed.ts` rodado com `tsx` (nova devDependency), via `pnpm db:seed` | O README promete Node 20+; o suporte nativo a TypeScript do Node não resolve o alias `@/*` nem imports sem extensão |
| Teste (AT03) | Roteiro manual, como na Fase 1, mais testes unitários do módulo de validação com `node:test` | O roteiro é o entregável da atividade; o parser de telefone e de valor é fácil de errar e o `tsx` já estará instalado |

## Ordem e commits

Uma branch (`feat/provider-profile`), um commit por task, na ordem do roadmap: T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 → T2.7. Marcar `[x]` no roadmap no commit de cada task.

Antes de cada commit: `pnpm lint && pnpm typecheck`. A partir da T2.2, também `pnpm db:push`.

A T2.4 não tem tela própria: o comportamento dela é conferido pelos critérios de aceite da T2.5.

---

## T2.1 — Definir campos (AT01)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/provider-validation.ts` | novo |

### Campos

| Campo | Obrigatório | Regra | Guardado como |
|---|---|---|---|
| Nome de exibição | sim | 2 a 80 caracteres após `trim()`. Vem preenchido com `user.name` | `display_name` |
| Telefone | sim | Ver "Telefone" abaixo | `phone`, só dígitos (10 ou 11) |
| Tem WhatsApp | — | Booleano, marcado por padrão | `phone_is_whatsapp` |
| Cidade | sim | 2 a 80 caracteres após `trim()` | `city` |
| UF | sim | Uma das 27 siglas | `state` |
| Serviços | sim | 1 a 5 slugs distintos | linhas em `provider_service` |
| Bairros | sim | 1 a 10 nomes distintos, cada um com 2 a 60 caracteres | linhas em `provider_area` |
| Valor por hora | não | R$ 1,00 a R$ 1.000,00 | `hourly_rate_cents` (inteiro) ou `null` |
| Descrição | não | Até 500 caracteres após `trim()`; vazio vira `null` | `description` |

**Telefone.** Remover tudo que não for dígito. Se sobrarem 12 ou 13 dígitos começando com `55`, descartar o `55`. O resultado é válido se tiver 10 ou 11 dígitos, os dois primeiros (DDD) entre 11 e 99 sem zero, e, quando tiver 11, o terceiro for `9`. Fixo (10 dígitos) é aceito mesmo com "Tem WhatsApp" marcado.

**Valor por hora.** Remover `R$` e espaços. Aceitar `80`, `80,5`, `80,50` e `1.200,00` (ponto só como separador de milhar, vírgula para centavos). `80.50` é recusado com mensagem própria, em vez de virar R$ 8.050,00.

**Bairros.** Em cada nome: `trim()` e espaços repetidos reduzidos a um. A chave de comparação é o nome sem acentos (`normalize("NFD")` + remoção de `\p{M}`) e em minúsculas; "São José" e "sao jose" são o mesmo bairro e fica o primeiro digitado.

### `src/lib/provider-validation.ts`

Módulo puro (sem React, sem servidor, sem banco), como o `auth-validation.ts`.

```ts
export const PROVIDER_LIMITS = {
  nameMin: 2, nameMax: 80,
  cityMin: 2, cityMax: 80,
  categoriesMax: 5,
  neighborhoodsMax: 10, neighborhoodMin: 2, neighborhoodMax: 60,
  rateMinCents: 100, rateMaxCents: 100_000,
  descriptionMax: 500,
} as const;

export const BRAZILIAN_STATES: readonly string[]; // 27 siglas, em ordem alfabética

export type ProviderField =
  | "displayName" | "phone" | "city" | "state"
  | "categories" | "neighborhoods" | "hourlyRate" | "description";

export type ProviderFieldErrors = Partial<Record<ProviderField, string>>;

// O que o formulário envia: tudo como o usuário digitou.
export type ProviderProfileInput = {
  displayName: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  city: string;
  state: string;
  categories: string[];
  neighborhoods: string[];
  hourlyRate: string;
  description: string;
};

// O que vai para o banco: normalizado.
export type ProviderProfileData = {
  displayName: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  city: string;
  state: string;
  categories: string[];
  neighborhoods: { name: string; key: string }[];
  hourlyRateCents: number | null;
  description: string | null;
};

export type SaveProviderProfileResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: ProviderFieldErrors; formError?: string };

export function normalizePhone(value: string): string | null;
export function parseHourlyRate(value: string): { cents: number | null } | { error: string };
export function neighborhoodKey(value: string): string;
export function parseProviderProfile(
  input: ProviderProfileInput,
): { ok: true; data: ProviderProfileData } | { ok: false; fieldErrors: ProviderFieldErrors };

export function formatPhone(digits: string): string;            // (11) 91234-5678 / (11) 3123-4567
export function formatHourlyRate(cents: number | null): string; // "R$ 80,00/h" / "Valor a combinar"
```

`parseProviderProfile` é chamada também pela server action com dados que vêm da rede: os tipos do TypeScript não valem em runtime. Ela deve conferir `typeof` de cada campo e `Array.isArray` das listas (com itens string) antes de usar, tratando qualquer coisa fora do formato como campo inválido, sem lançar exceção.

`parseProviderProfile` não sabe quais categorias existem; ela só valida quantidade, formato e remove repetidas. A existência é conferida na server action (T2.4).

### Mensagens

| Campo | Condição | Mensagem |
|---|---|---|
| Nome | vazio | Informe como você quer aparecer para os clientes. |
| | fora de 2–80 | O nome precisa ter entre 2 e 80 caracteres. |
| Telefone | vazio | Informe um telefone para contato. |
| | inválido | Digite um telefone com DDD, como (11) 91234-5678. |
| Cidade | vazio | Informe sua cidade. |
| | fora de 2–80 | A cidade precisa ter entre 2 e 80 caracteres. |
| UF | fora da lista | Escolha o estado. |
| Serviços | nenhum | Escolha pelo menos um serviço. |
| | mais de 5 | Escolha no máximo 5 serviços. |
| Bairros | nenhum | Adicione pelo menos um bairro. |
| | mais de 10 | Adicione no máximo 10 bairros. |
| | algum fora de 2–60 | Cada bairro precisa ter entre 2 e 60 caracteres. |
| Valor/hora | formato inválido | Digite um valor como 80 ou 80,00. |
| | ponto como decimal (`80.50`) | Use vírgula para os centavos, como 80,50. |
| | fora da faixa | O valor precisa ficar entre R$ 1,00 e R$ 1.000,00. |
| Descrição | mais de 500 | A descrição pode ter no máximo 500 caracteres. |

### Aceite

- `pnpm typecheck` e `pnpm lint` passam. O módulo não importa nada de `react`, `next` ou `@/db`.
- A tabela de campos acima é o entregável da AT01.

---

## T2.2 — Tabelas (AT02)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/db/schema.ts` | adicionar as quatro tabelas e as relações, abaixo das do Better Auth |

Rodar o gerador do Better Auth (`auth generate --output src/db/schema.ts`) reescreve o arquivo. Se for preciso rodá-lo de novo, conferir o diff para não perder as tabelas da aplicação.

### Tabelas

```ts
export const providerProfile = pgTable("provider_profile", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  phone: text("phone").notNull(),
  phoneIsWhatsapp: boolean("phone_is_whatsapp").default(true).notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  hourlyRateCents: integer("hourly_rate_cents"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
    .$onUpdate(() => new Date()).notNull(),
});

export const serviceCategory = pgTable("service_category", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
});

export const providerService = pgTable(
  "provider_service",
  {
    providerId: text("provider_id").notNull()
      .references(() => providerProfile.id, { onDelete: "cascade" }),
    categorySlug: text("category_slug").notNull()
      .references(() => serviceCategory.slug, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.categorySlug] }),
    index("provider_service_category_idx").on(table.categorySlug),
  ],
);

export const providerArea = pgTable(
  "provider_area",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    providerId: text("provider_id").notNull()
      .references(() => providerProfile.id, { onDelete: "cascade" }),
    neighborhood: text("neighborhood").notNull(),
    neighborhoodKey: text("neighborhood_key").notNull(),
  },
  (table) => [
    uniqueIndex("provider_area_provider_key_uidx").on(table.providerId, table.neighborhoodKey),
    index("provider_area_key_idx").on(table.neighborhoodKey),
  ],
);
```

- Apagar a conta apaga o perfil, que apaga serviços e áreas (cascata). Apagar uma categoria em uso é bloqueado (`restrict`).
- Os índices em `category_slug` e `neighborhood_key` existem para a busca da Fase 3.
- Lat/lng (T3.2) e média/contagem de avaliações (T5.3) **não** entram agora.

### Relações

`userRelations` ganha `providerProfile: one(providerProfile)`. Novas: `providerProfileRelations` (`user`, `services: many(providerService)`, `areas: many(providerArea)`), `serviceCategoryRelations` (`providers: many(providerService)`), `providerServiceRelations` (`provider`, `category`) e `providerAreaRelations` (`provider`).

### Aceite

- `pnpm db:push` cria as quatro tabelas sem pedir confirmação de perda de dados.
- No Drizzle Studio: inserir duas linhas em `provider_profile` com o mesmo `user_id` falha; apagar um `user` com perfil remove o perfil e as linhas filhas.

---

## T2.3 — Seed de categorias (AT02)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/db/seed.ts` | novo |
| `package.json` | devDependency `tsx`; script `"db:seed": "tsx --env-file=.env src/db/seed.ts"` |
| `README.md`, `CLAUDE.md` | incluir `pnpm db:seed` depois de `pnpm db:push` |

### Script

- Abre conexão própria (`postgres(process.env.DATABASE_URL!, { max: 1 })`) e a encerra com `client.end()` no final. Não importa `@/db`: aquele client não é exportado e deixaria o processo pendurado.
- `insert ... onConflictDoUpdate` pelo `slug`, atualizando `name` e `sortOrder`. Rodar duas vezes não duplica nem falha.
- Não apaga categorias que saíram da lista (podem estar em uso). Imprime quantas linhas foram gravadas.
- `sortOrder` é a posição na lista abaixo.

### Categorias

| Slug | Nome |
|---|---|
| `eletricista` | Eletricista |
| `encanador` | Encanador |
| `diarista` | Diarista |
| `pintor` | Pintor |
| `pedreiro` | Pedreiro |
| `jardineiro` | Jardineiro |
| `marceneiro` | Marceneiro |
| `montador-de-moveis` | Montador de móveis |
| `chaveiro` | Chaveiro |
| `ar-condicionado` | Técnico de ar-condicionado |
| `informatica` | Técnico de informática |
| `eletrodomesticos` | Conserto de eletrodomésticos |
| `fretes-e-mudancas` | Fretes e mudanças |
| `baba` | Babá |
| `cuidador-de-idosos` | Cuidador de idosos |
| `manicure` | Manicure e pedicure |
| `cabeleireiro` | Cabeleireiro |
| `aulas-particulares` | Aulas particulares |

### Aceite

- Em banco recém-criado, `pnpm db:push && pnpm db:seed` deixa 18 linhas em `service_category`.
- Rodar `pnpm db:seed` de novo mantém 18 linhas e o comando termina sozinho (não fica preso).

---

## T2.4 — Server action de criar/editar perfil (AT02)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/provider-queries.ts` | novo (leitura, só servidor) |
| `src/app/dashboard/prestador/actions.ts` | novo (`"use server"`) |

### `src/lib/provider-queries.ts`

```ts
export async function listServiceCategories(): Promise<{ slug: string; name: string }[]>; // por sortOrder
export async function getOwnProviderProfile(userId: string);   // perfil completo, com phone, serviços e áreas; ou null
export async function getPublicProviderProfile(id: string);    // usada na T2.6
```

`getPublicProviderProfile` seleciona as colunas explicitamente e **não** inclui `phone`, `phoneIsWhatsapp` nem `userId` além do necessário para saber se quem vê é o dono (devolver `userId` é aceitável; o telefone não).

### `saveProviderProfile`

```ts
"use server";

export async function saveProviderProfile(
  input: ProviderProfileInput,
): Promise<SaveProviderProfileResult>;
```

Arquivos `"use server"` só podem exportar funções assíncronas; por isso os tipos ficam em `provider-validation.ts`.

Passos:

1. `const session = await requireSession("/dashboard/prestador")`. O dono do perfil é sempre `session.user.id`; nenhum id de usuário ou de perfil vem do cliente.
2. `parseProviderProfile(input)`. Se falhar, devolver `{ ok: false, fieldErrors }`.
3. Conferir as categorias: buscar em `service_category` os slugs recebidos; se a quantidade encontrada for diferente da enviada, devolver `fieldErrors.categories = "Escolha serviços da lista."`.
4. Em uma transação (`db.transaction`):
   - `insert` em `provider_profile` com `onConflictDoUpdate` em `userId`, devolvendo o `id` (`returning`);
   - apagar as linhas de `provider_service` e `provider_area` do perfil e inserir as novas.
5. Devolver `{ ok: true, id }`.

Erros inesperados (banco fora do ar etc.): capturar, `console.error` e devolver `{ ok: false, fieldErrors: {}, formError: "Não foi possível salvar o perfil. Tente de novo." }`. O `redirect` do `requireSession` funciona lançando uma exceção de controle do Next: a chamada fica **fora** do `try`.

Não é preciso `revalidatePath`: as páginas que mostram o perfil leem a sessão (`SiteHeader`), então já são renderizadas a cada request.

### Aceite

- `pnpm typecheck` e `pnpm lint` passam.
- Os comportamentos são conferidos pela tela na T2.5 (ver aceite de lá) e no roteiro da T2.7.

---

## T2.5 — Tela de cadastro do prestador (AT02)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/dashboard/prestador/page.tsx` | novo (server) |
| `src/app/dashboard/prestador/provider-profile-form.tsx` | novo (client) |
| `src/components/form-field.tsx` | extrair `Field` (rótulo + conteúdo + dica/erro); `FormField` passa a usá-lo |
| `src/components/choice-chips.tsx` | novo: seleção múltipla em forma de etiquetas |
| `src/components/tag-input.tsx` | novo: lista de etiquetas digitadas |
| `src/app/design/page.tsx`, `demos.tsx` | adicionar `Field` com textarea, `ChoiceChips` e `TagInput` à vitrine |
| `src/app/dashboard/page.tsx` | card do prestador |
| `src/app/page.tsx` | CTA "Quero oferecer serviços" |
| `CLAUDE.md` | estrutura, componentes novos, "estado atual" |

O `matcher` do proxy já cobre `/dashboard/prestador`; não muda.

### Página

`page.tsx`: `requireSession("/dashboard/prestador")`, depois `listServiceCategories()` e `getOwnProviderProfile(session.user.id)` em paralelo. Renderiza `SiteHeader` e o formulário, passando as categorias e os valores iniciais (do perfil, ou só `displayName = session.user.name` e "Tem WhatsApp" marcado quando não há perfil).

Título "Criar perfil de prestador" ou "Editar perfil", conforme exista perfil. Se `listServiceCategories()` vier vazia, mostrar um aviso com `text-warning` dizendo para rodar `pnpm db:seed`, em vez de um formulário impossível de enviar.

### Formulário

Uma coluna, largura máxima de leitura (`max-w-2xl`), três blocos com `h2`:

| Bloco | Campos |
|---|---|
| Sobre você | Nome de exibição; Telefone (`type="tel"`, `inputMode="tel"`, `autoComplete="tel-national"`, formatado com `formatPhone` enquanto digita); caixa "Este número tem WhatsApp" |
| O que você faz | Serviços (`ChoiceChips`, dica "Escolha até 5"); Valor por hora (`inputMode="decimal"`, prefixo "R$", dica "Opcional. Deixe em branco para combinar com o cliente."); Descrição (`Textarea`, contador `n/500`, dica "Opcional.") |
| Onde você atende | Cidade; UF (`Select`); Bairros (`TagInput`, dica "Digite e aperte Enter. Até 10.") |

Botão "Criar perfil" / "Salvar alterações" (`size="lg"`), com "Salvando..." enquanto pendente.

Comportamento, igual ao dos formulários de auth:

1. `<form noValidate>`; estado `fieldErrors` e `formError`.
2. No submit: montar o `ProviderProfileInput` e rodar `parseProviderProfile`. Com erro: gravar em `fieldErrors`, focar o primeiro campo inválido na ordem da tela e **não** chamar a action.
3. Sem erro: chamar `saveProviderProfile(input)` dentro de `startTransition`. Se voltar `ok: false`, mostrar `fieldErrors` e/ou `formError` (parágrafo `role="alert"` com `text-destructive` acima do botão).
4. Se voltar `ok: true`: `toast.success("Perfil criado.")` ou `"Perfil atualizado."`, `router.push("/dashboard")` e `router.refresh()`.
5. Alterar um campo limpa só o erro dele.

### Componentes novos

**`Field`** (em `form-field.tsx`): recebe `label`, `htmlFor`, `hint`, `error` e `children`; renderiza o mesmo rótulo, dica e erro que `FormField` tem hoje, com os mesmos ids (`${id}-error`, `${id}-hint`). Para grupos (serviços, bairros) aceita `as="fieldset"` e usa `<legend>` no lugar de `<label>`.

**`ChoiceChips`**: `options: { value: string; label: string }[]`, `value: string[]`, `onChange`, `max?`, `name`. Cada opção é um `<label>` com `<input type="checkbox">` visualmente escondido (`sr-only`), estilizado como etiqueta: marcado usa `bg-primary text-primary-foreground`, desmarcado `bg-muted`; foco visível pelo `has-focus-visible:` do label. Ao atingir `max`, as opções desmarcadas ficam `disabled`.

**`TagInput`**: `value: string[]`, `onChange`, `max?`, `placeholder`, `id`. Um `Input` e, abaixo, as etiquetas (`Badge`) com botão de remover (`aria-label="Remover {nome}"`). Enter ou vírgula adiciona o texto atual; sair do campo com texto digitado também adiciona, para não perder o que foi digitado antes de clicar em salvar. Backspace com o campo vazio remove a última. Ignora vazio e repetido (comparando por `neighborhoodKey`, passado pela prop `keyOf`). Enter dentro do campo não envia o formulário.

Todos usam apenas tokens semânticos e entram em `/design`.

### Dashboard e home

`/dashboard` ganha um segundo card, com `getOwnProviderProfile`:

- sem perfil: título "Ofereça seus serviços", descrição "Crie seu perfil de prestador e apareça para clientes do seu bairro.", botão "Criar perfil" → `/dashboard/prestador`;
- com perfil: nome de exibição, serviços como `Badge`, cidade/UF e botão "Editar perfil" → `/dashboard/prestador`. (O botão "Ver perfil público" entra na T2.6.)

Na home, um terceiro link no hero, discreto (`variant="link"` ou texto com as classes de link já usadas): "Quero oferecer serviços" → `/sign-up?redirectTo=%2Fdashboard%2Fprestador`. O `safeRedirectPath` e o `redirectIfAuthenticated` existentes já tratam o resto; conferir que quem já está logado e clica nesse link cai em `/dashboard`, de onde chega ao card.

### Aceite

- Deslogado, `/dashboard/prestador` leva a `/sign-in?redirectTo=%2Fdashboard%2Fprestador` e, após o login, volta para o formulário.
- Conta sem perfil: o nome vem preenchido; enviar vazio mostra mensagens em pt-BR nos campos obrigatórios, foca o primeiro e não faz request (aba Network).
- Preencher só os obrigatórios cria o perfil: toast, volta para `/dashboard`, card mostra o resumo. No Studio: 1 linha em `provider_profile`, telefone só com dígitos, `hourly_rate_cents` e `description` nulos.
- Abrir `/dashboard/prestador` de novo mostra tudo preenchido; trocar serviços e bairros e salvar substitui as linhas filhas (sem sobras) e mantém o mesmo `id`.
- `(11) 91234-5678`, `11912345678` e `+55 11 91234-5678` gravam `11912345678`. `1234` é recusado.
- `80`, `80,5` e `1.000,00` são aceitos e gravam 8000, 8050 e 100000 centavos (conferir no Studio). `1.200,00` e `0,50` mostram a mensagem de faixa. `80.50` mostra a mensagem da vírgula.
- "Centro", "centro" e " CENTRO " viram uma etiqueta só. O 11º bairro e o 6º serviço não entram.
- Chamar a action com um slug inexistente (editar o valor de um checkbox pelo DevTools) devolve "Escolha serviços da lista." e não grava nada.
- Duas contas diferentes criam perfis independentes; uma não consegue alterar o da outra (não existe parâmetro para isso).
- Os componentes novos aparecem em `/design`.
- Cronometrar o preenchimento dos obrigatórios uma vez e anotar o tempo no commit: é a linha de base da T6.1.

---

## T2.6 — Página pública do perfil (AT02)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/prestador/[id]/page.tsx` | novo (server) |
| `src/app/prestador/[id]/not-found.tsx` | novo |
| `src/app/dashboard/page.tsx` | botão "Ver perfil público" no card |
| `CLAUDE.md` | estrutura |

A rota é pública: **não** entra no `matcher` do proxy e não chama `requireSession`.

### Página

- `params` é uma `Promise` no Next 16: `const { id } = await params`.
- `getPublicProviderProfile(id)`; sem resultado, `notFound()`.
- `generateMetadata`: título `"{nome} — {primeiro serviço} em {cidade}/{UF} | ServiAqui"`. Para não consultar duas vezes, embrulhar `getPublicProviderProfile` em `cache` do React.

Conteúdo, com `SiteHeader` e a mesma largura das outras páginas:

1. Cabeçalho: `Avatar` com as iniciais, `h1` com o nome de exibição, linha "{cidade}/{UF}" com `MapPinIcon`.
2. Reputação: `Badge` "Novo no ServiAqui". A nota entra na T5.4; não renderizar `RatingStars` com zero.
3. Serviços: um `Badge` por categoria, na ordem do seed.
4. Valor: `formatHourlyRate(hourlyRateCents)`.
5. Sobre: a descrição, com `whitespace-pre-line`; a seção some se não houver descrição. É texto do usuário: renderizar como texto, nunca como HTML.
6. Bairros atendidos: lista dos bairros, em ordem alfabética.
7. Contato: card com o texto "Contato por WhatsApp e telefone em breve." (`text-muted-foreground`). É o lugar onde a Fase 4 coloca os botões.
8. Se `getSession()` for do dono do perfil: botão "Editar perfil" → `/dashboard/prestador`.

`not-found.tsx`: `SiteHeader`, "Prestador não encontrado", texto curto e botão "Voltar para o início".

### Aceite

- Deslogado (janela anônima), `/prestador/{id}` abre e mostra nome, cidade, serviços, valor, descrição e bairros.
- O telefone não aparece na tela nem no HTML/payload da página (procurar os dígitos no "Exibir código-fonte" e na aba Network).
- Perfil sem valor mostra "Valor a combinar"; sem descrição, a seção "Sobre" não aparece.
- Descrição com `<b>teste</b>` e com quebras de linha aparece literal e com as quebras.
- `/prestador/qualquer-coisa` mostra a página "Prestador não encontrado" em pt-BR, com status 404.
- Logado como dono aparece "Editar perfil"; logado com outra conta, não.
- O card do dashboard tem "Ver perfil público" apontando para a URL certa.
- `pnpm build` passa.

---

## T2.7 — Teste do cadastro (AT03)

### Arquivos

| Arquivo | Ação |
|---|---|
| `docs/testes/perfil-prestador.md` | novo |
| `src/lib/provider-validation.test.ts` | novo |
| `package.json` | script `"test": "tsx --test src/lib/provider-validation.test.ts"` |
| `README.md`, `CLAUDE.md` | citar `pnpm test` e apontar para o roteiro |

### Testes unitários

Com `node:test` e `node:assert/strict`, sem dependência nova além do `tsx` da T2.3. Cobrir só o módulo puro:

- `normalizePhone`: com máscara, sem máscara, com `+55`, fixo de 10 dígitos, celular sem o 9, DDD com zero, curto demais, vazio.
- `parseHourlyRate`: vazio → `null`; `80`, `80,5`, `80,50`, `R$ 80`, `1.000,00` (limite superior), `0,99` e `1.000,01` (fora da faixa), `80.50`, `abc`.
- `neighborhoodKey`: acentos, caixa, espaços repetidos.
- `parseProviderProfile`: entrada válida mínima; sem serviços; 6 serviços; slugs repetidos; bairros repetidos por chave; 11 bairros; descrição com 501 caracteres; descrição só com espaços → `null`; campo com tipo errado (número no lugar de string, string no lugar de lista) devolve erro de campo sem lançar.

### Roteiro manual

Mesmo formato do `docs/testes/autenticacao.md`: pré-requisitos (incluindo `pnpm db:seed`), contas de teste (prestador A, prestador B), tabelas com ID, pré-condição, passos, resultado esperado e coluna "OK / Falhou", e registro de execução no fim. A numeração continua a da Fase 1.

**Cadastro**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-25 | Deslogado abre `/dashboard/prestador` | Vai para o login com `redirectTo`; após entrar, volta ao formulário |
| CT-26 | Home → "Quero oferecer serviços" → criar conta | Termina em `/dashboard/prestador` |
| CT-27 | Abrir o formulário sem perfil | Nome preenchido com o da conta; "Tem WhatsApp" marcado |
| CT-28 | Enviar vazio (apagando o nome) | Mensagem em cada campo obrigatório; foco no primeiro; nenhuma request |
| CT-29 | Telefone `1234` | "Digite um telefone com DDD, como (11) 91234-5678." |
| CT-30 | Valor `80.50` | "Use vírgula para os centavos, como 80,50." |
| CT-31 | Valor `0,50` e `1.200,00` | Mensagem de faixa |
| CT-32 | Marcar o 6º serviço | Não é possível: as opções restantes ficam desabilitadas |
| CT-33 | Adicionar "Centro" e "centro" | Uma etiqueta só |
| CT-34 | Só os campos obrigatórios, válidos | Toast "Perfil criado."; `/dashboard` mostra o resumo; no banco, valor e descrição nulos e telefone só com dígitos |
| CT-35 | Cronometrar o CT-34 do primeiro clique no formulário até o toast | Menos de 30 s (registrar o tempo) |

**Edição**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-36 | Abrir "Editar perfil" | Todos os campos com os valores salvos |
| CT-37 | Trocar serviços e bairros, preencher valor e descrição, salvar | Toast "Perfil atualizado."; no banco, mesmo `id`, linhas filhas substituídas |
| CT-38 | Apagar valor e descrição, salvar | Voltam a `null`; página pública mostra "Valor a combinar" e sem "Sobre" |
| CT-39 | Prestador B cria o próprio perfil | Perfil de A inalterado; `user_id` distintos |
| CT-40 | Slug de serviço adulterado pelo DevTools | "Escolha serviços da lista."; nada gravado |

**Página pública**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-41 | Abrir `/prestador/{id}` deslogado | Perfil completo visível |
| CT-42 | Procurar o telefone no código-fonte da página | Não aparece |
| CT-43 | Descrição com `<b>teste</b>` e duas linhas | Texto literal, com a quebra de linha |
| CT-44 | `/prestador/nao-existe` | "Prestador não encontrado", status 404 |
| CT-45 | Dono logado abre a própria página | Botão "Editar perfil" visível; com a conta B, não |
| CT-46 | Apagar o `user` de B no Studio e abrir a página dele | 404; sem linhas órfãs em `provider_service` e `provider_area` |

### Aceite

- `pnpm test` passa.
- O roteiro foi executado por inteiro no commit final da fase, com o registro preenchido e todos os casos em "OK".

---

## Fora do escopo

- Lat/lng, geocoding e busca (Fase 3). O bairro fica só como texto + chave.
- Botões de WhatsApp/ligar e exibição do telefone (Fase 4).
- Avaliações e nota (Fase 5).
- Criptografia do telefone (T6.3) e medição formal dos 30 s (T6.1); aqui só fica a linha de base.
- Foto do prestador e upload de imagens.
- Excluir ou despublicar o perfil; mais de um perfil por conta.
- Tela de administração de categorias (mudam só pelo seed).
- Autocomplete de cidade/bairro e validação contra uma base oficial.
- Listagem de prestadores (chega com `/buscar`).
