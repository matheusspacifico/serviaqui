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
    sign-up, sign-in, forgot-password, reset-password
    dashboard/              rota protegida (server component + getSession)
  app/design/               vitrine do design system
  components/               componentes de domínio
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
pnpm db:studio    # Drizzle Studio
pnpm db:generate  # gera migrations SQL (não usado por enquanto)
```

## Convenções

- Schema do banco só em `src/db/schema.ts`. As tabelas do Better Auth são geradas com `pnpm dlx auth@latest generate --config src/lib/auth.ts --output src/db/schema.ts`; tabelas da aplicação entram no mesmo arquivo, escritas à mão.
- Usar `pnpm db:push` pra sincronizar o banco. Sem migrations por enquanto.
- Componentes de UI vêm do shadcn (`pnpm dlx shadcn@latest add <componente>`). O Button do estilo `base-nova` usa a prop `render` (não existe `asChild`); ao renderizar um `Link`, passar também `nativeButton={false}`.
- Mutações via server actions. Autenticação no browser usa o `authClient`; no servidor, `auth.api.getSession({ headers: await headers() })`.
- Sem provedor de e-mail ainda: o link de reset de senha é apenas logado no console em `src/lib/auth.ts`.
- Comentários no código só quando realmente necessário.
