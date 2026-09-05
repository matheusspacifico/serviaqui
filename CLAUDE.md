# ServiAqui

Marketplace de prestadores de serviço (projeto de faculdade).
Estado atual: apenas o setup da stack e o fluxo de autenticação; nenhuma feature de negócio ainda.

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
    sign-up, sign-in, forgot-password, reset-password
    dashboard/              rota protegida (server component + getSession)
  components/ui/            componentes shadcn/ui
  db/
    index.ts                client Drizzle
    schema.ts               schema do banco (único lugar)
  lib/
    auth.ts                 config do Better Auth (server)
    auth-client.ts          client do Better Auth (browser)
    utils.ts                helper cn()
drizzle.config.ts
docker-compose.yml
```

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # build de produção
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm db:up        # sobe o Postgres (docker compose up -d)
pnpm db:down      # derruba o Postgres
pnpm db:push      # aplica o schema no banco
pnpm db:studio    # Drizzle Studio
pnpm db:generate  # gera migrations SQL (não usado por enquanto)
```

## Convenções

- Schema do banco só em `src/db/schema.ts`. As tabelas do Better Auth são geradas com `pnpm dlx auth@latest generate --config src/lib/auth.ts --output src/db/schema.ts`; tabelas da aplicação entram no mesmo arquivo, escritas à mão.
- Usar `pnpm db:push` pra sincronizar o banco. Sem migrations por enquanto.
- Componentes de UI vêm do shadcn (`pnpm dlx shadcn@latest add <componente>`). O Button do estilo `base-nova` usa a prop `render` (não existe `asChild`).
- Mutações via server actions. Autenticação no browser usa o `authClient`; no servidor, `auth.api.getSession({ headers: await headers() })`.
- Sem provedor de e-mail ainda: o link de reset de senha é apenas logado no console em `src/lib/auth.ts`.
- Comentários no código só quando realmente necessário.
