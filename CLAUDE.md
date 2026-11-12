# ServiAqui

Marketplace de prestadores de serviço (projeto de faculdade).
Estado atual: stack, autenticação e design system; nenhuma feature de negócio ainda.

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
  app/design/               vitrine do design system
  components/               componentes de domínio
  components/ui/            componentes shadcn/ui
  db/
    index.ts                client Drizzle
    schema.ts               schema do banco (único lugar)
    seed.ts                 seed das categorias de serviço (pnpm db:seed)
  lib/
    auth.ts                 config do Better Auth (server)
    auth-client.ts          client do Better Auth (browser)
    auth-validation.ts      validadores e limites de senha (cliente e servidor)
    auth-errors.ts          tradução dos erros do Better Auth por código
    session.ts              getSession, requireSession, redirectIfAuthenticated
    redirect.ts             safeRedirectPath (redirectTo seguro)
  proxy.ts                  checagem otimista de cookie nas rotas logadas
    utils.ts                helper cn()
drizzle.config.ts
docker-compose.yml
```

## Design system

- Visual quente: primária terracota, neutros quentes, só tema light (sem `.dark`).
- Tokens em `src/app/globals.css`. Usar sempre os semânticos (`primary`, `muted-foreground`, `destructive`, `success`, `warning`, `rating`), nunca cores cruas tipo `text-red-600`.
- Fontes: Geist no corpo (`font-sans`), Bricolage Grotesque nos títulos (`font-heading`, aplicado automático em h1–h3).
- Componentes de domínio em `src/components/` (`logo`, `rating-stars`, `site-header`, `auth-shell`, `sign-out-button`, `form-field`); shadcn fica em `src/components/ui/`.
- Vitrine em `/design`: todo componente novo reutilizável entra lá.
- Toasts com `sonner` (`toast.success(...)`); o `Toaster` já está no layout.

## Roadmap

Tasks em `docs/roadmap.md`, ligadas às atividades (ATxx) do cronograma. Marcar `[x]` ao concluir.

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # build de produção
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm db:up        # sobe o Postgres (docker compose up -d)
pnpm db:down      # derruba o Postgres
pnpm db:push      # aplica o schema no banco
pnpm db:seed      # grava as categorias de serviço (idempotente; rodar depois do db:push)
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
- Erros do Better Auth são exibidos via `authErrorMessage` (`src/lib/auth-errors.ts`), nunca `error.message`.
- Sem provedor de e-mail ainda: o link de reset de senha é apenas logado no console em `src/lib/auth.ts`.
- Comentários no código só quando realmente necessário.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
