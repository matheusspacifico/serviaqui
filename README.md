# ServiAqui

Marketplace de prestadores de serviço. Projeto de faculdade.

Nesta etapa o repositório contém a autenticação (cadastro, login, recuperação de senha), o perfil do prestador (cadastro e edição em `/dashboard/prestador`, página pública em `/prestador/[id]`) e a busca de prestadores em `/buscar`, por distância ou por bairro. Contato e avaliação ainda não existem.

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
| `OVERPASS_URL` | Endereço da API Overpass (OpenStreetMap), de onde vêm os bairros de cada cidade. Opcional; o valor do exemplo é o padrão. |
| `GEO_USER_AGENT` | Identificação do app nas consultas ao Overpass. Troque o contato pelo seu. Vazio, os bairros não são carregados do mapa. |

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

Gravar prestadores fictícios em São Paulo e Campinas, para testar a busca sem depender do mapa (rodar depois do `db:seed`; `--clean` remove o que o script criou):

```bash
pnpm db:seed:demo
```

Ligar os bairros dos perfis já cadastrados aos lugares do mapa e carregar os bairros das cidades deles (só é preciso em bancos que já tinham perfis antes da busca; `--reload` força nova carga das cidades):

```bash
pnpm db:places
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
pnpm test        # testes unitários (perfil do prestador, distância, busca, municípios)
pnpm data:municipalities # regenera src/data/municipalities.json (já vem commitado)
pnpm db:generate # gera migrations SQL a partir do schema (não usado por enquanto)
```

## Testando a autenticação

O roteiro de teste de cadastro, login, rotas e recuperação de senha está em [`docs/testes/autenticacao.md`](docs/testes/autenticacao.md).

Ainda não há provedor de e-mail configurado: **o link de redefinição de senha aparece no terminal onde o `pnpm dev` está rodando**.

## Testando o perfil do prestador

`pnpm test` roda os testes unitários de telefone, valor por hora e bairros. O roteiro manual de cadastro, edição e página pública está em [`docs/testes/perfil-prestador.md`](docs/testes/perfil-prestador.md).

## Dados de localização

- **Municípios:** `src/data/municipalities.json` traz os 5.571 municípios do Brasil (código IBGE, nome, UF e coordenadas da sede). Foi gerado em 13/11/2026 por `pnpm data:municipalities` a partir do repositório [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros) (licença MIT), que deriva de dados públicos do IBGE. O app nunca baixa esse arquivo em tempo de execução.
- **Bairros:** vêm do [OpenStreetMap](https://www.openstreetmap.org/copyright) pela API Overpass, uma consulta por cidade, na primeira vez que alguém precisa dela. O resultado fica nas tabelas `geo_place` e `geo_city` e não é consultado de novo. O Overpass recebe só o código IBGE do município.

## Segurança

Como as senhas são armazenadas: [`docs/seguranca-senhas.md`](docs/seguranca-senhas.md).
