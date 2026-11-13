# ServiAqui

Marketplace de prestadores de serviço (projeto de faculdade).
Estado atual: stack, autenticação, design system e perfil do prestador (cadastro/edição em `/dashboard/prestador`, página pública em `/prestador/[id]`). Busca, contato e avaliação ainda não existem.

## Stack

- Next.js 16 (App Router) + TypeScript, pasta `src/`, alias `@/*`
- Tailwind CSS 4 + shadcn/ui (estilo `base-nova`, componentes em cima do Base UI)
- Better Auth 1.7 com e-mail/senha e adapter Drizzle (`@better-auth/drizzle-adapter`)
- Drizzle ORM + drizzle-kit, driver `postgres` (postgres-js)
- PostgreSQL 16 em Docker (`docker-compose.yml`)
- pnpm

## Estrutura

```
src/
  app/                      rotas (App Router)
    api/auth/[...all]/      route handler do Better Auth
    sign-up, sign-in, forgot-password   page.tsx (server) + *-form.tsx (client)
    reset-password
    dashboard/              rota protegida (requireSession)
      prestador/            criar/editar perfil: page.tsx, provider-profile-form.tsx, actions.ts
    prestador/[id]/         página pública do perfil (sem sessão; nunca consulta o telefone)
  app/design/               vitrine do design system
  components/               componentes de domínio
  components/ui/            componentes shadcn/ui
  db/
    index.ts                client Drizzle
    schema.ts               schema do banco (único lugar)
    seed.ts                 seed das categorias de serviço (pnpm db:seed)
    seed-demo.ts            prestadores fictícios em São Paulo e Campinas (pnpm db:seed:demo)
    places.ts               liga áreas antigas a geo_place e carrega cidades (pnpm db:places)
  data/
    municipalities.json     municípios do Brasil (gerado por scripts/build-municipalities.ts; commitado)
  lib/
    auth.ts                 config do Better Auth (server)
    auth-client.ts          client do Better Auth (browser)
    auth-validation.ts      validadores e limites de senha (cliente e servidor)
    auth-errors.ts          tradução dos erros do Better Auth por código
    session.ts              getSession, requireSession, redirectIfAuthenticated
    redirect.ts             safeRedirectPath (redirectTo seguro)
    provider-validation.ts  campos, limites e validadores do perfil (cliente e servidor)
    provider-queries.ts     leitura de categorias e perfis (só servidor)
    geo.ts                  Haversine, bounding box, formatDistance (puro)
    search-validation.ts    limites, tipos e parser da busca (puro)
    municipalities.ts       consultas à lista de municípios (só servidor)
    overpass.ts             cliente do Overpass, com fila e 1 consulta/s (só servidor)
    geo-places.ts           ensurePlaces, ensureCityNeighborhoods (só servidor)
    provider-search.ts      queries da busca e da lista de bairros (só servidor)
    geo-actions.ts          actions públicas: listStateCities, listCityNeighborhoods, detectCity
    browser-location.ts     navigator.geolocation e Permissions API (só browser)
  proxy.ts                  checagem otimista de cookie nas rotas logadas
    utils.ts                helper cn()
drizzle.config.ts
docker-compose.yml
```

## Design system

- Visual quente: primária terracota, neutros quentes, só tema light (sem `.dark`).
- Tokens em `src/app/globals.css`. Usar sempre os semânticos (`primary`, `muted-foreground`, `destructive`, `success`, `warning`, `rating`), nunca cores cruas tipo `text-red-600`.
- Fontes: Geist no corpo (`font-sans`), Bricolage Grotesque nos títulos (`font-heading`, aplicado automático em h1–h3).
- Componentes de domínio em `src/components/` (`logo`, `rating-stars`, `site-header`, `auth-shell`, `sign-out-button`, `form-field`, `choice-chips`, `tag-input`); shadcn fica em `src/components/ui/`.
- Formulários: `FormField` para um `Input` com rótulo/dica/erro; `Field` (mesmo arquivo) para qualquer outro controle (textarea, select) e, com `as="fieldset"`, para grupos. `ChoiceChips` é a seleção múltipla em etiquetas; `TagInput` é a lista de etiquetas digitadas.
- Vitrine em `/design`: todo componente novo reutilizável entra lá.
- Toasts com `sonner` (`toast.success(...)`); o `Toaster` já está no layout.

## Testes

- Unitários só para módulos puros, com `node:test` (`pnpm test`). Arquivo novo de teste entra no script `test` do `package.json`.
- Roteiros manuais em `docs/testes/` (`autenticacao.md`, `perfil-prestador.md`), com registro de execução no fim.

## Roadmap

Tasks em `docs/roadmap.md`, ligadas às atividades (ATxx) do cronograma. Marcar `[x]` ao concluir.

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # build de produção
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # testes unitários (node:test via tsx) dos módulos puros de src/lib
pnpm db:up        # sobe o Postgres (docker compose up -d)
pnpm db:down      # derruba o Postgres
pnpm db:push      # aplica o schema no banco
pnpm db:seed      # grava as categorias de serviço (idempotente; rodar depois do db:push)
pnpm db:seed:demo # prestadores de demonstração com coordenadas fixas (--clean remove)
pnpm db:places    # liga áreas sem place_id a geo_place e carrega as cidades dos perfis (--reload recarrega)
pnpm data:municipalities  # regenera src/data/municipalities.json
pnpm db:studio    # Drizzle Studio
pnpm db:generate  # gera migrations SQL (não usado por enquanto)
```

## Convenções

- Schema do banco só em `src/db/schema.ts`. As tabelas do Better Auth são geradas com `pnpm dlx auth@latest generate --config src/lib/auth.ts --output src/db/schema.ts`; tabelas da aplicação entram no mesmo arquivo, escritas à mão.
- Usar `pnpm db:push` pra sincronizar o banco e, em seguida, `pnpm db:seed`. Sem migrations por enquanto.
- Componentes de UI vêm do shadcn (`pnpm dlx shadcn@latest add <componente>`). O Button do estilo `base-nova` usa a prop `render` (não existe `asChild`); ao renderizar um `Link`, passar também `nativeButton={false}`.
- Mutações via server actions. Autenticação no browser usa o `authClient`; no servidor, a sessão é lida só por `src/lib/session.ts` (`getSession`, `requireSession`, `redirectIfAuthenticated`), nunca por `auth.api.getSession` direto.
- Toda rota logada nova entra no `matcher` de `src/proxy.ts` **e** chama `requireSession()` na página ou na server action. O proxy só confere se o cookie existe; sozinho não é proteção.
- Telas só para deslogado (`/sign-in`, `/sign-up`, `/forgot-password`) chamam `redirectIfAuthenticated()` na página, não no proxy.
- Prestador é qualquer conta com uma linha em `provider_profile` (1:1 com `user`); não há coluna de papel. O dono do perfil é sempre o usuário da sessão, nunca um id vindo do cliente.
- Regras e mensagens do perfil ficam só em `src/lib/provider-validation.ts`; o formulário e a server action chamam o mesmo `parseProviderProfile`.
- O telefone do prestador não aparece em página pública: `getPublicProviderProfile` não seleciona `phone`. O contato entra na Fase 4, por botões que registram o evento.
- Lugares: `geo_place` tem uma linha por (UF, cidade, bairro); `geo_city` marca as cidades cujos bairros já vieram do mapa. Toda `provider_area` nova é gravada com `place_id`, via `ensurePlaces`. Bairro fora do mapa fica com a coordenada da sede do município (`origin = "provider"`).
- A cidade do prestador precisa existir em `src/data/municipalities.json` (`findMunicipality`); grava-se o nome oficial. Esse JSON só é importado por código de servidor.
- O Overpass só é chamado por `ensureCityNeighborhoods` (uma vez por cidade) e só recebe o código IBGE. Na action de salvar perfil ele roda em `after()`, sem atrasar a resposta.
- A busca é pública e lida por server actions (`searchProviders` em `src/app/buscar/actions.ts`, mais as de `src/lib/geo-actions.ts`): exceção consciente a "mutações via server actions", porque as coordenadas do cliente não podem ir na URL. Elas não chamam `requireSession`, não logam a entrada e não selecionam `phone`.
- As coordenadas do cliente nunca são gravadas, logadas, postas na URL nem enviadas a serviço externo.
- Erros do Better Auth são exibidos via `authErrorMessage` (`src/lib/auth-errors.ts`), nunca `error.message`.
- Sem provedor de e-mail ainda: o link de reset de senha é apenas logado no console em `src/lib/auth.ts`.
- Comentários no código só quando realmente necessário.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
