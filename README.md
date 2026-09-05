# ServiAqui

Marketplace de prestadores de serviço. Projeto de faculdade.

Nesta etapa o repositório contém apenas o setup da stack funcionando de ponta a ponta (cadastro, login, recuperação de senha e uma página protegida). Nenhuma feature de negócio ainda.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Better Auth (e-mail/senha)
- Drizzle ORM + PostgreSQL (Docker)
- pnpm

## Pré-requisitos

- Node.js 20 ou superior
- pnpm (`corepack enable` ou `npm i -g pnpm`)
- Docker Desktop aberto (com integração WSL, se estiver no Windows)

## Instalação

```bash
pnpm install
```

## Variáveis de ambiente

Copie o exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres. O valor do exemplo já aponta pro container do Docker. |
| `BETTER_AUTH_SECRET` | Chave usada pelo Better Auth. Gere uma com `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | URL base da aplicação. Em desenvolvimento, `http://localhost:3000`. |

## Banco de dados

Subir o Postgres:

```bash
pnpm db:up
```

Criar as tabelas no banco a partir de `src/db/schema.ts`:

```bash
pnpm db:push
```

Abrir o Drizzle Studio pra inspecionar os dados:

```bash
pnpm db:studio
```

Derrubar o banco (os dados ficam no volume `pgdata`):

```bash
pnpm db:down
```

## Rodando o projeto

```bash
pnpm dev
```

Acesse http://localhost:3000.

Outros comandos:

```bash
pnpm build       # build de produção
pnpm start       # roda o build
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm db:generate # gera migrations SQL a partir do schema (não usado por enquanto)
```

## Testando a autenticação

1. Acesse `/sign-up` e crie uma conta (senha com no mínimo 8 caracteres).
2. Você será redirecionado pra `/dashboard`, que mostra seu e-mail e um botão **Sair**.
3. Clique em **Sair** e tente acessar `/dashboard` de novo: você será redirecionado pra `/sign-in`.
4. Em `/sign-in`, entre com e-mail e senha.
5. Pra testar a recuperação de senha, acesse `/forgot-password` e informe o e-mail.
   Ainda não há provedor de e-mail configurado: **o link de redefinição aparece no terminal onde o `pnpm dev` está rodando**.
6. Abra o link do terminal no navegador, defina a nova senha e entre novamente em `/sign-in`.
