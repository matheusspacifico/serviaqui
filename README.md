# ServiAqui

Marketplace de prestadores de serviço. Projeto de faculdade.

Nesta etapa o repositório contém a autenticação (cadastro, login, recuperação de senha) e o perfil do prestador: cadastro e edição em `/dashboard/prestador` e página pública em `/prestador/[id]`. Busca, contato e avaliação ainda não existem.

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

Gravar as categorias de serviço (pode rodar mais de uma vez; não duplica):

```bash
pnpm db:seed
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
pnpm test        # testes unitários das regras do perfil do prestador
pnpm db:generate # gera migrations SQL a partir do schema (não usado por enquanto)
```

## Testando a autenticação

O roteiro de teste de cadastro, login, rotas e recuperação de senha está em [`docs/testes/autenticacao.md`](docs/testes/autenticacao.md).

Ainda não há provedor de e-mail configurado: **o link de redefinição de senha aparece no terminal onde o `pnpm dev` está rodando**.

## Testando o perfil do prestador

`pnpm test` roda os testes unitários de telefone, valor por hora e bairros. O roteiro manual de cadastro, edição e página pública está em [`docs/testes/perfil-prestador.md`](docs/testes/perfil-prestador.md).

## Segurança

Como as senhas são armazenadas: [`docs/seguranca-senhas.md`](docs/seguranca-senhas.md).
