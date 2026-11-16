# Spec — Fase 3: Busca geolocalizada (pacote 2.1)

Cobre as tasks T3.1 a T3.9 do `docs/roadmap.md` (atividades AT10 a AT14, requisito RF03). A T3.9 é um incremento no cadastro do prestador (pacote 1.1) que depende da base de geolocalização criada aqui.

Texto das atividades no documento de cronograma:

| AT | Atividade | Dias | Predecessora |
|---|---|---|---|
| AT10 | Definir o algoritmo de busca por serviço e bairro/raio | 2 | AT03 |
| AT11 | Implementar a integração com o serviço de geolocalização | 3 | AT10 |
| AT12 | Desenvolver o critério de ordenação por avaliação e distância | 2 | AT10 |
| AT13 | Implementar a interface de resultados de busca | 2 | AT11, AT12 |
| AT14 | Testar a busca geolocalizada em diferentes cenários de bairro/raio | 2 | AT13 |

O cronograma também prevê a AT32 ("política de retenção e anonimização de localização, 90 dias", Fase 6). Ela condiciona esta fase: quanto menos localização for guardada aqui, menos há para anonimizar lá.

## De onde vieram as decisões

Definido pelo autor do projeto, em conversa e por um esboço da tela:

- Layout: barra compacta no topo (localização, serviço, filtros) e lista em coluna única. O cabeçalho do site não muda.
- Card: nome da pessoa ou empresa, preço e bairro/distância.
- Dois modos de busca: por distância (raio a partir da localização exata do cliente) ou por bairro (correspondência exata, sem raio em volta do bairro).
- Seletor de cidade, que por padrão traz a cidade onde o cliente está, e lista de bairros dessa cidade, filtrável ao digitar.
- A lista mostra **todos** os bairros da cidade, inclusive os que não têm prestador, com visual diferente. Escolher um bairro vazio mostra "Infelizmente ainda não temos prestadores nessa região."
- A permissão de localização só é pedida quando o cliente clica (opção B, abaixo), não ao abrir a página.
- Logado, a página inicial é a busca.
- Card "Encontre serviços" no dashboard.
- No cadastro do prestador: sugerir bairros a partir de um bairro de referência e um raio, já selecionados; limite de bairros sobe para 30.
- A cidade do prestador tem que ser válida: cidade digitada errada não é aceita.
- Bairro que o prestador informa e o mapa não tem continua valendo, com o centro da cidade como localização aproximada.
- Trocar a cidade no cadastro limpa os bairros já adicionados, com aviso.
- Raio padrão de 5 km (os números do esboço eram fictícios). Condomínios e loteamentos que o mapa lista como bairro são aceitos como vierem.

O restante foi decidido por quem escreveu a spec. Os pontos marcados com **(a confirmar)** podem ser trocados sem mexer no resto.

## Situação atual

- `provider_area` guarda só o nome do bairro e a chave normalizada. `provider_profile` tem `city` e `state`, digitados livremente. Não há latitude/longitude em lugar nenhum.
- Não existe tabela de avaliação (Fase 5) nem coluna de nota no perfil.
- Não existe rota de listagem. O único caminho até um perfil é a URL `/prestador/[id]`.
- `/` mostra a mesma home (criar conta / já tenho conta) para logado e deslogado. `DEFAULT_REDIRECT` é `/dashboard`.
- O `SiteHeader` não tem link de busca; o `/dashboard` só tem o card da conta e o do prestador.
- Já existem os índices `provider_service_category_idx` e `provider_area_key_idx`, criados na Fase 2 para esta busca.
- Perfis criados na Fase 2 já estão no banco e precisam ser ligados aos lugares (backfill).
- Não há nenhuma chamada HTTP de saída no projeto, nem variável de ambiente além das do banco e do Better Auth.
- Componentes shadcn instalados: `avatar`, `badge`, `button`, `card`, `input`, `label`, `select`, `separator`, `skeleton`, `sonner`, `textarea`. Não há `popover`.
- Limite atual de bairros por perfil: 10.

## Fontes de dados de localização

| Dado | Fonte | Como é usado |
|---|---|---|
| Municípios do Brasil (código IBGE, nome, UF, coordenadas da sede) | Arquivo estático no repositório, `src/data/municipalities.json`, gerado uma vez a partir de dados públicos do IBGE | Seletor de cidade; descobrir a cidade do cliente; localização aproximada de bairro que não está no mapa. Nenhuma request em tempo de execução |
| Bairros de cada cidade (nome e coordenadas) | OpenStreetMap, pela API Overpass, consultando o município pelo código IBGE (tag `IBGE:GEOCODIGO`) | Uma consulta por cidade, na primeira vez que alguém precisa dela. O resultado fica gravado em `geo_place` e não é consultado de novo |
| Localização do cliente | API de geolocalização do navegador | Só no browser e no corpo das requests ao nosso servidor |

Não se usa Nominatim nem geocoding de texto: com a lista de bairros de cada cidade já no banco, com coordenadas, não há o que geocodificar.

Conferido com chamadas reais ao Overpass público: a consulta por `IBGE:GEOCODIGO` devolveu 635 itens para São Paulo (3550308) e 320 para Itu (3523909). O serviço público respondeu "servidor lotado" em 2 de 6 tentativas; por isso o resultado é guardado e a falha tem tratamento na tela.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Dois modos de busca | **Por distância**: raio a partir da localização exata do cliente. **Por bairro**: cidade e bairro escolhidos; aparece quem atende exatamente naquele bairro | Definido pelo autor. "Bairro é bairro": não há como avaliar o raio de um bairro |
| O que é "a localização do prestador" | O centro de cada bairro que ele atende. Não se pede endereço | O perfil não tem endereço, e pedir um criaria dado pessoal sensível sem necessidade. A distância exibida é sempre "até o bairro atendido mais próximo" |
| Distância cliente → prestador | A menor distância entre o cliente e os bairros do prestador que têm coordenadas | Um prestador com 3 bairros está "perto" se qualquer um deles estiver |
| Cálculo | Haversine em SQL puro, com pré-filtro por caixa delimitadora (bounding box). Sem PostGIS | Volume de projeto de faculdade; evita trocar a imagem do Postgres e instalar extensão |
| Onde ficam os lugares | Tabela `geo_place`, uma linha por (UF, cidade, bairro), com coordenadas. `provider_area` ganha `place_id`. Tabela `geo_city` registra quais cidades já tiveram os bairros carregados do mapa | A mesma tabela serve à busca por distância, à lista de bairros e ao cadastro do prestador |
| Lista de cidades | Todos os municípios do Brasil, do arquivo estático. Seleção em dois passos: UF e, depois, cidade com campo de filtro | Definido pelo autor: o cliente precisa achar a própria cidade e o próprio bairro mesmo sem prestador lá |
| Lista de bairros | Todos os bairros da cidade vindos do mapa, mais os que prestadores digitaram e o mapa não tem. Com prestador (do serviço escolhido): visual normal e quantidade. Sem prestador: visual apagado, mas selecionável | Definido pelo autor: bairro ausente da lista parece bug |
| Bairro que não está no mapa | Continua valendo. Fica com a coordenada da sede do município, marcada como aproximada | Cidades pequenas podem ter poucos bairros no mapa. Sem isso, prestadores de lá nunca apareceriam por distância |
| Cidade padrão | O município cuja sede está mais perto das coordenadas do cliente, calculado no nosso servidor com o arquivo estático | Funciona para qualquer cidade do Brasil e as coordenadas do cliente não saem do nosso servidor. Perto de divisa pode sugerir a cidade vizinha; o cliente troca no seletor |
| Quando pedir a localização | **Opção B, definida pelo autor**: o navegador só pergunta quando o cliente clica no botão de localização ou escolhe "Distância". Se a permissão já foi dada em visita anterior, a página usa a localização ao abrir, sem perguntar | Pedir permissão sem contexto na primeira visita leva à recusa |
| Limites do Overpass | Uma consulta por vez e no máximo 1 por segundo no processo; `User-Agent` identificando o app; resultado guardado para sempre; uma nova tentativa em caso de servidor ocupado; crédito "© OpenStreetMap" nas telas que mostram bairros | Serviço público e gratuito, de uso moderado |
| Privacidade da localização do cliente | As coordenadas não são gravadas no banco, não vão para a URL, não são logadas e não são enviadas a nenhum serviço externo. São arredondadas para 3 casas (~110 m) no browser e trafegam só no corpo das requests ao nosso servidor | Nada para anonimizar na AT32; URL não vaza localização em histórico, logs de acesso ou `Referer` |
| Como a busca é chamada | Server actions públicas, chamadas pelo formulário (client) | As coordenadas não podem ir na URL, então a página não consegue renderizar o resultado no servidor só com `searchParams`. É leitura por server action, exceção consciente à regra "mutações via server actions" |
| Estado na URL | `servico` sempre; por distância, `raio` e `ordem`; por bairro, `local` (id do `geo_place`). Com `servico` e `local` a busca roda sozinha ao abrir | Busca por bairro fica compartilhável; busca por distância depende da localização de quem abre |
| Serviço | Obrigatório, uma categoria | RF03 é "busca por serviço e bairro/raio" |
| Raio | Opções fixas: 2, 5, 10 e 20 km. Padrão 5 km | O servidor recusa qualquer outro valor |
| Ordenação (AT12) | Por distância: "Mais próximos" (padrão) ou "Melhor avaliados". Por bairro: sempre por avaliação. A nota usa média bayesiana | Ver T3.5. Sem a correção, uma única nota 5 passaria na frente de 50 notas com média 4,8 |
| Nota antes da Fase 5 | `provider_profile` ganha `rating_average` e `rating_count` agora, zerados. A Fase 5 (T5.3) só passa a escrever neles | A AT12 fica entregue e testável (editando os valores no Studio), sem depender da tabela `review` |
| Limite de resultados | Os 50 primeiros na ordenação escolhida. Sem paginação | Volume esperado é pequeno |
| Rota | `/buscar`, pública: fora do `matcher` do proxy e sem `requireSession` | Cliente pesquisa sem conta; o contato (Fase 4) é que pode exigir login |
| Página inicial de quem está logado | A busca. `/` redireciona quem tem sessão para `/buscar`, e o destino padrão depois do login passa de `/dashboard` para `/buscar`. A home atual fica só para deslogado. `/dashboard` continua como "Minha conta" | Definido pelo autor: clicar no logo estando logado mostrava a tela de criar conta |
| Telefone | Não aparece nos resultados. A query de busca não seleciona `phone` | Mesma regra da página pública |
| Cidade do prestador | Tem que existir na lista oficial de municípios. A partir da T3.2 o servidor recusa cidade que não existe na UF; na T3.9 o campo de texto vira seleção da lista | Definido pelo autor: cidade digitada errada não pode ser aceita. Ela deixaria o prestador fora da busca por distância e fora da lista de bairros da cidade certa |
| Cadastro do prestador (T3.9) | Cidade escolhida da lista; bairros com autocompletar pela lista da cidade; "sugerir bairros" por bairro de referência e raio, já selecionados; limite de 30 bairros | Definido pelo autor |
| Dados de demonstração | Script `pnpm db:seed:demo` com prestadores fictícios em São Paulo e Campinas, bairros com coordenadas fixas e as duas cidades já marcadas como carregadas **(cidades a confirmar)** | Os cenários de teste (AT14) precisam de distâncias conhecidas e não podem depender do Overpass estar no ar |
| Validação | Módulos puros (`geo.ts`, `search-validation.ts`, `ranking.ts`), usados no cliente e no servidor, com testes em `node:test` | Mesmo padrão das Fases 1 e 2 |

## Ordem e commits

Uma branch (`feat/fase-3-geolocalizacao`), um commit por task, na ordem do roadmap: T3.1 → T3.2 → T3.3 → T3.4 → T3.5 → T3.6 → T3.7 → T3.8 → T3.9. Marcar `[x]` no roadmap no commit de cada task.

A T3.9 fica por último de propósito: a busca (RF03) fica entregue mesmo se o incremento do cadastro não couber no prazo. Até lá, o campo de cidade continua sendo texto, mas o servidor já só aceita cidade que existe na lista oficial (T3.2), reconhecida pela chave normalizada ("sao paulo" vale como "São Paulo").

Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`. Nas tasks que mexem no schema (T3.2 e T3.5), também `pnpm db:push`.

T3.3, T3.4 e T3.5 não têm tela própria. O comportamento delas é conferido por testes unitários, pelo script de demonstração e pelos critérios de aceite da T3.6.

Antes de escrever código de rota, `after()` ou `searchParams`, ler o guia correspondente em `node_modules/next/dist/docs/` (regra do `CLAUDE.md`). Em especial `01-app/03-api-reference/04-functions/after.md`.

---

## T3.1 — Definir o algoritmo (AT10)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/geo.ts` | novo (puro) |
| `src/lib/search-validation.ts` | novo (puro) |
| `src/lib/geo.test.ts`, `src/lib/search-validation.test.ts` | novos |
| `package.json` | incluir os dois arquivos no script `test` |

### Algoritmo

Entrada: uma categoria de serviço, uma origem e uma ordenação. A origem define o modo.

**Modo distância** (origem = coordenadas do cliente, mais um raio em km):

1. Candidatos: prestadores que têm a categoria pedida em `provider_service`.
2. Para cada candidato, a distância é a menor distância Haversine entre o cliente e os bairros dele que têm coordenadas. Antes do Haversine, descartar pela caixa delimitadora os bairros claramente fora do raio.
3. Fica quem tem distância menor ou igual ao raio. Prestador sem nenhum bairro com coordenadas não entra.
4. Ordenar conforme a T3.5 e cortar em 50.

**Modo bairro** (origem = um lugar de `geo_place`, escolhido da lista):

1. Candidatos: prestadores que têm a categoria pedida **e** uma área ligada àquele lugar (`provider_area.place_id`).
2. Não há raio. Nenhum bairro vizinho entra.
3. Ordenar por avaliação (T3.5) e cortar em 50.

**Cidade padrão**: dadas as coordenadas do cliente, é o município cuja sede está mais perto, a até 100 km. Fora desse alcance (fora do Brasil, por exemplo), não há cidade padrão.

Raio da Terra usado: 6371 km. Fórmula:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
d = 2 · 6371 · asin(min(1, √a))
```

O `min(1, …)` protege contra erro de ponto flutuante em pontos quase antípodas.

Caixa delimitadora para um raio `r` em km ao redor de (`lat`, `lng`):

```
Δlat = r / 111,32
Δlng = r / (111,32 · cos(lat))
```

### `src/lib/geo.ts`

Módulo puro, sem React, servidor ou banco.

```ts
export const EARTH_RADIUS_KM = 6371;
export const CITY_DETECTION_RADIUS_KM = 100;

export type Coordinates = { lat: number; lng: number };
export type BoundingBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

export function isValidCoordinates(value: unknown): value is Coordinates; // números finitos, lat em [-90, 90], lng em [-180, 180]
export function roundCoordinates(c: Coordinates): Coordinates;            // 3 casas decimais
export function haversineKm(a: Coordinates, b: Coordinates): number;
export function boundingBox(center: Coordinates, radiusKm: number): BoundingBox;
export function formatDistance(km: number): string;
```

`formatDistance`: abaixo de 1 km, metros arredondados para a centena mais próxima com mínimo de 100 ("≈ 300 m"); de 1 a 10 km, uma casa decimal com vírgula ("≈ 2,3 km"); acima de 10 km, inteiro ("≈ 14 km"). O "≈" é obrigatório: a distância é até o centro de um bairro, não até uma porta.

### `src/lib/search-validation.ts`

Módulo puro. Concentra limites, tipos e o parser da busca.

```ts
export const SEARCH_RADII_KM = [2, 5, 10, 20] as const;
export const DEFAULT_RADIUS_KM = 5;
export const SEARCH_SORTS = ["distancia", "avaliacao"] as const;
export const DEFAULT_SORT = "distancia";
export const SEARCH_RESULT_LIMIT = 50;

export type SearchSort = (typeof SEARCH_SORTS)[number];

// `coords` é opcional na origem por bairro: se o cliente já deu a localização,
// ela vai junto só para o card poder mostrar a distância.
export type SearchOriginInput =
  | { kind: "coords"; lat: number; lng: number; radiusKm: number }
  | { kind: "place"; placeId: string; coords?: { lat: number; lng: number } };

export type SearchInput = { category: string; sort: string; origin: SearchOriginInput };

export type SearchField = "category" | "sort" | "radiusKm" | "place" | "origin";
export type SearchFieldErrors = Partial<Record<SearchField, string>>;

export type SearchData = {
  category: string;
  sort: SearchSort;
  origin:
    | { kind: "coords"; lat: number; lng: number; radiusKm: (typeof SEARCH_RADII_KM)[number] }
    | { kind: "place"; placeId: string; coords: Coordinates | null };
};

export function parseSearchInput(
  input: SearchInput,
): { ok: true; data: SearchData } | { ok: false; fieldErrors: SearchFieldErrors };

export function parseCoordinatesInput(
  input: unknown,
): { ok: true; coords: Coordinates } | { ok: false };   // usado por detectCity

export type SearchCity = { state: string; cityKey: string; city: string };   // "SP", "campinas", "Campinas"

export type SearchNeighborhood = {
  placeId: string;
  neighborhood: string;
  neighborhoodKey: string;
  providerCount: number;   // prestadores do serviço escolhido (ou de qualquer serviço, se nenhum foi escolhido)
};

export type CityNeighborhoodsResult = {
  neighborhoods: SearchNeighborhood[];
  mapStatus: "loaded" | "unavailable" | "unknown-city";
};

export type ProviderSearchItem = {
  id: string;
  displayName: string;
  hourlyRateCents: number | null;
  services: { slug: string; name: string }[];
  neighborhood: string;           // por distância: o bairro atendido mais próximo; por bairro: o bairro buscado
  distanceKm: number | null;      // null quando não há coordenadas do cliente ou do bairro
  ratingAverage: number | null;   // null enquanto ratingCount for 0
  ratingCount: number;
};

export type SearchOriginResolved =
  | { kind: "coords"; radiusKm: number }
  | { kind: "place"; neighborhood: string; city: string; state: string };

export type SearchProvidersResult =
  | { ok: true; origin: SearchOriginResolved; providers: ProviderSearchItem[]; truncated: boolean }
  | { ok: false; fieldErrors: SearchFieldErrors; formError?: string };
```

Regras do parser:

- Como em `parseProviderProfile`, a entrada vem da rede: conferir `typeof` de tudo e devolver erro de campo, sem lançar.
- `category`: string não vazia, até 60 caracteres. A existência no banco é conferida na action.
- `sort`: precisa ser um dos valores de `SEARCH_SORTS`.
- Origem `coords`: `isValidCoordinates`, resultado passado por `roundCoordinates`; `radiusKm` precisa ser um dos valores de `SEARCH_RADII_KM`.
- Origem `place`: `placeId` string não vazia, até 64 caracteres; a existência é conferida na action. `coords` ausente ou inválido vira `null`, sem erro (é só um extra para exibição).

### Mensagens

| Campo | Condição | Mensagem |
|---|---|---|
| Serviço | vazio | Escolha o serviço que você procura. |
| Ordenação | fora da lista | Escolha uma das ordenações da lista. |
| Raio | fora da lista | Escolha uma das distâncias da lista. |
| Bairro | vazio ou inexistente | Escolha um bairro da lista. |
| Origem | coordenadas inválidas ou formato desconhecido | Não foi possível usar essa localização. Escolha um bairro. |

### Testes unitários

- `haversineKm`: mesmo ponto → 0; dois pontos com distância conhecida (por exemplo Praça da Sé −23,5505/−46,6333 e MASP −23,5614/−46,6559, cerca de 2,6 km, tolerância de 0,1 km); simetria (`a→b` igual a `b→a`).
- `boundingBox`: o centro fica dentro; um ponto a `r` km ao norte e outro a `r` km a leste ficam na borda (tolerância de 1%).
- `formatDistance`: 0,04 → "≈ 100 m"; 0,34 → "≈ 300 m"; 2,34 → "≈ 2,3 km"; 14,6 → "≈ 15 km".
- `roundCoordinates` e `isValidCoordinates`: `NaN`, string, latitude 91, longitude −181.
- `parseSearchInput`: entrada válida de cada origem; origem `place` com e sem `coords`, e com `coords` inválido (vira `null`); raio 7; ordenação desconhecida; `placeId` vazio; coordenadas como string; `origin` ausente; objeto com tipo errado em cada campo, sem lançar.
- `parseCoordinatesInput`: válido, `null`, objeto sem `lng`, números fora da faixa.

### Aceite

- `pnpm test`, `pnpm typecheck` e `pnpm lint` passam. Os dois módulos não importam `react`, `next` nem `@/db`.
- A seção "Algoritmo" acima é o entregável da AT10.

---

## T3.2 — Cidades, bairros e coordenadas (AT11)

Camada de dados de localização. Sem tela nova, além de um aviso no dashboard.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/data/municipalities.json` | novo: municípios do Brasil |
| `scripts/build-municipalities.ts` | novo: gera o arquivo acima |
| `src/lib/municipalities.ts` | novo (só servidor): consultas ao arquivo |
| `src/lib/municipalities.test.ts` | novo; incluir no script `test` |
| `src/lib/overpass.ts` | novo (só servidor): cliente do Overpass |
| `src/lib/geo-places.ts` | novo (só servidor): `ensurePlaces`, `ensureCityNeighborhoods` |
| `src/db/schema.ts` | tabelas `geo_place` e `geo_city`; coluna `place_id` em `provider_area`; relações |
| `src/app/dashboard/prestador/actions.ts` | ligar áreas a `geo_place`; carregar a cidade com `after()` |
| `src/db/places.ts` | novo: script de backfill |
| `src/lib/provider-queries.ts` | `getOwnProviderProfile` devolve a precisão de cada bairro |
| `src/app/dashboard/page.tsx` | avisos no card do prestador |
| `package.json` | scripts `data:municipalities` e `db:places` |
| `.env.example`, `README.md`, `CLAUDE.md` | variáveis novas, comandos novos, convenções |

### Municípios

`src/data/municipalities.json`: uma lista com os 5.570 municípios, cada um `{ "code": "3509502", "name": "Campinas", "state": "SP", "lat": -22.9, "lng": -47.06 }`. `code` é o código IBGE de 7 dígitos; `lat`/`lng` são as coordenadas da sede.

- Gerado por `pnpm data:municipalities` (`tsx scripts/build-municipalities.ts`) e **commitado**. O app nunca baixa isso em tempo de execução.
- Fonte: dados públicos do IBGE. Quem implementa escolhe a origem concreta que traga código, nome, UF e coordenadas da sede (a API de localidades do IBGE dá código, nome e UF; as coordenadas vêm de um conjunto público derivado do IBGE, como o repositório `kelvins/municipios-brasileiros`), confere a licença e registra a origem e a data no `README.md`.
- O script valida o resultado: 5.570 linhas, 27 UFs, códigos únicos, coordenadas válidas.

`src/lib/municipalities.ts` (só servidor; o JSON nunca entra no bundle do browser):

```ts
export type Municipality = { code: string; name: string; cityKey: string; state: string; lat: number; lng: number };

export function listMunicipalities(state: string): SearchCity[];                       // ordem alfabética
export function findMunicipality(state: string, cityKey: string): Municipality | null;
export function nearestMunicipality(coords: Coordinates): Municipality | null;         // sede mais próxima, até CITY_DETECTION_RADIUS_KM
```

`cityKey` é `neighborhoodKey(name)` (a mesma normalização do perfil: sem acento, minúscula, espaços reduzidos). É assim que a cidade digitada pelo prestador na Fase 2 é reconhecida. O índice por UF e por chave é montado uma vez, na carga do módulo. `nearestMunicipality` percorre a lista inteira com `haversineKm`; com 5.570 itens isso é imediato.

Testes: `findMunicipality("SP", "sao paulo")` acha São Paulo; grafia com acento e caixa diferentes dá a mesma chave; cidade inexistente → `null`; `nearestMunicipality` das coordenadas da Sé → São Paulo; das do Cambuí → Campinas; de um ponto no meio do Atlântico → `null`; `listMunicipalities("SP")` em ordem alfabética e sem cidade de outra UF.

### Schema

```ts
export const geoPlace = pgTable(
  "geo_place",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    state: text("state").notNull(),
    city: text("city").notNull(),
    cityKey: text("city_key").notNull(),
    neighborhood: text("neighborhood").notNull(),
    neighborhoodKey: text("neighborhood_key").notNull(),
    origin: text("origin", { enum: ["osm", "provider"] }).default("provider").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("geo_place_key_uidx").on(table.state, table.cityKey, table.neighborhoodKey),
    index("geo_place_lat_lng_idx").on(table.lat, table.lng),
  ],
);

export const geoCity = pgTable(
  "geo_city",
  {
    state: text("state").notNull(),
    cityKey: text("city_key").notNull(),
    city: text("city").notNull(),
    ibgeCode: text("ibge_code").notNull(),
    neighborhoodsLoadedAt: timestamp("neighborhoods_loaded_at").notNull(),
    neighborhoodCount: integer("neighborhood_count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.state, table.cityKey] })],
);
```

Em `provider_area`: `placeId: text("place_id").references(() => geoPlace.id, { onDelete: "set null" })`, anulável (as linhas da Fase 2 ainda não têm), e `index("provider_area_place_idx").on(table.placeId)`.

O que cada combinação significa em `geo_place`:

| `origin` | `lat`/`lng` | Significado | Precisão |
|---|---|---|---|
| `osm` | preenchidos | Bairro que veio do mapa | exata (centro do bairro) |
| `provider` | preenchidos | Bairro digitado por um prestador e ausente do mapa; coordenada da sede do município | aproximada (cidade) |
| `provider` | nulos | Bairro digitado em uma cidade que não está na lista de municípios (grafia errada) | nenhuma |

- Uma linha em `geo_city` significa "os bairros desta cidade já foram carregados do mapa". Não há linha para cidade ainda não carregada.
- `geo_place` e `geo_city` não têm dado pessoal: são bairros e cidades, informação pública.

Relações: `geoPlaceRelations` (`areas: many(providerArea)`); `providerAreaRelations` ganha `place: one(geoPlace)`.

### `src/lib/overpass.ts`

Só servidor.

```ts
// null = falha (timeout, servidor ocupado, resposta inválida). Lista vazia = o mapa não tem bairros para o município.
export async function fetchCityNeighborhoods(ibgeCode: string): Promise<{ name: string; lat: number; lng: number }[] | null>;
```

- `POST {OVERPASS_URL}` com corpo `data=<consulta>` (form-urlencoded). Cabeçalho `User-Agent` vindo de `GEO_USER_AGENT`. `AbortSignal.timeout(45000)`.

```
[out:json][timeout:40];
area["IBGE:GEOCODIGO"="{código}"]->.cidade;
(
  node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](area.cidade);
  way["place"~"^(suburb|neighbourhood|quarter)$"]["name"](area.cidade);
  relation["place"~"^(suburb|neighbourhood|quarter)$"]["name"](area.cidade);
);
out center tags;
```

- O código entra na consulta só depois de conferido como 7 dígitos. Nenhum texto de usuário entra na consulta.
- Coordenada de cada item: `lat`/`lon` do nó, ou `center` de `way`/`relation`. Nome: `tags.name`. Itens sem nome ou sem coordenada válida são descartados.
- Fila: uma consulta por vez e pelo menos 1100 ms entre o início de duas consultas, por processo.
- Resposta 429, 502, 503 ou 504: uma nova tentativa depois de 3 s. Falhando de novo, `null`.
- Nunca lança; falha é logada com `console.error`.
- Se `GEO_USER_AGENT` estiver vazio, não consulta: devolve `null` e loga um aviso uma vez.

Variáveis de ambiente (em `.env.example`):

```
OVERPASS_URL=https://overpass-api.de/api/interpreter
GEO_USER_AGENT="ServiAqui/0.1 (projeto academico; contato: seu-email@exemplo.com)"
```

`OVERPASS_URL` tem esse valor como padrão no código.

### `src/lib/geo-places.ts`

Só servidor.

```ts
export type PlaceKey = { state: string; city: string; neighborhood: string };

// Garante uma linha em geo_place para cada chave e devolve os ids, na mesma ordem.
// Não consulta o mapa. Aceita o db ou uma transação.
export async function ensurePlaces(executor, places: PlaceKey[]): Promise<string[]>;

// Garante que os bairros da cidade vieram do mapa. Nunca lança.
export async function ensureCityNeighborhoods(
  executor, city: { state: string; cityKey: string },
): Promise<"loaded" | "unavailable" | "unknown-city">;
```

`ensurePlaces`: para cada chave, `insert ... onConflictDoNothing` com `origin = "provider"` e `lat`/`lng` da sede do município (`findMunicipality`), ou nulos se a cidade não estiver na lista. Depois, `select` dos ids. Linha que já existe não é alterada.

`ensureCityNeighborhoods`:

1. Já existe linha em `geo_city` → `"loaded"`, sem consultar nada.
2. `findMunicipality`; sem resultado → `"unknown-city"`.
3. `fetchCityNeighborhoods(code)`; `null` → `"unavailable"`, sem gravar nada (a próxima chamada tenta de novo).
4. Normalizar os nomes como no perfil (espaços, 2 a 60 caracteres) e remover repetidos por `neighborhoodKey`, ficando com o primeiro.
5. Em uma transação: `insert` em `geo_place` com `origin = "osm"` e as coordenadas; em conflito pela chave única, atualizar `neighborhood`, `lat`, `lng` e `origin` (um bairro que um prestador tinha digitado passa a ter a coordenada exata). Depois, inserir a linha em `geo_city` com a contagem.
6. `"loaded"`.

Duas chamadas simultâneas para a mesma cidade compartilham a mesma promise (mapa em memória por chave), para não consultar o mapa duas vezes.

### Salvamento do perfil

Em `saveProviderProfile`:

0. Depois de `parseProviderProfile` e antes de qualquer gravação: `findMunicipality(state, neighborhoodKey(city))`. Não achando, devolver `fieldErrors.city = "Não encontramos essa cidade em {UF}. Confira a grafia."` e não gravar nada. Achando, gravar em `provider_profile.city` o **nome oficial** do município, não o texto digitado.
1. Dentro da transação, antes de inserir as áreas: `ensurePlaces(tx, …)` com a cidade e a UF do perfil e cada bairro. Inserir `provider_area` já com `placeId`.
2. Depois da transação, fora do `try` que trata erro de banco: `after(() => ensureCityNeighborhoods(db, …))`. Se a cidade ainda não tinha sido carregada, os bairros do prestador que existem no mapa ganham a coordenada exata alguns segundos depois.
3. O retorno da action não muda e não espera o mapa.

As áreas são sempre apagadas e recriadas, então trocar de cidade ou de bairro refaz as ligações. Lugares que ficaram sem nenhuma área não são apagados.

### Script `pnpm db:places`

`"db:places": "tsx --env-file=.env src/db/places.ts"`. Mesma estrutura do `seed.ts`: conexão própria, passada como executor, encerrada no final.

1. Para cada `provider_area` com `place_id` nulo: `ensurePlaces` com a cidade/UF do perfil e gravar o `place_id`.
2. Para cada cidade distinta dos perfis: `ensureCityNeighborhoods`.
3. Com `--reload`, apagar antes a linha de `geo_city` dessas cidades, para forçar nova carga.
4. Imprimir um resumo: áreas ligadas, cidades carregadas, cidades indisponíveis, cidades não reconhecidas (com o nome, para corrigir).

Rodar duas vezes seguidas não consulta o mapa na segunda.

### Avisos no dashboard

`getOwnProviderProfile` passa a devolver `areas` como `{ neighborhood: string; precision: "exact" | "city" | "none" }[]` e `cityRecognized: boolean`. O formulário de edição continua usando só os nomes.

No card do prestador em `/dashboard`, com `text-warning`:

- Cidade não reconhecida: "Não reconhecemos a cidade {cidade}/{UF}. Você aparece para quem busca seus bairros pelo nome, mas não em buscas por distância. Confira a grafia no seu perfil."
- Cidade reconhecida, já carregada do mapa, e algum bairro com precisão `city`: "Não achamos {lista} no mapa. Usamos o centro da cidade como localização aproximada desses bairros. Confira a grafia no seu perfil."

Enquanto a cidade não foi carregada, o segundo aviso não aparece (ainda não se sabe). `getPublicProviderProfile` não muda.

### Aceite

- `pnpm data:municipalities` gera o arquivo com 5.570 municípios e 27 UFs; o arquivo está commitado.
- `pnpm db:push` cria `geo_place`, `geo_city` e a coluna `place_id` sem pedir confirmação de perda de dados.
- Com perfis da Fase 2 no banco, `pnpm db:places` liga todas as áreas, carrega as cidades e imprime o resumo. Rodar de novo não consulta o mapa (conferir pelo tempo e pelo log).
- Salvar um perfil de uma cidade real ainda não carregada responde na mesma velocidade de antes (o toast não espera). Alguns segundos depois, `geo_city` tem a cidade e `geo_place` tem os bairros dela com `origin = "osm"`.
- Um bairro do perfil que existe no mapa fica `osm` com a coordenada do bairro. Um bairro inventado ("Xyzabc123") fica `provider` com a coordenada da sede, e o aviso aparece no dashboard.
- Salvar um perfil com cidade que não existe na UF ("Campnas", ou "Campinas" com UF "RJ") é recusado com a mensagem no campo de cidade, e nada é gravado. "campinas" e "CAMPINAS" são aceitos e gravados como "Campinas".
- Um perfil antigo (Fase 2) com cidade fora da lista continua no banco até ser editado: depois de `pnpm db:places`, os lugares dele ficam sem coordenada, o script lista a cidade no resumo e o dashboard mostra o aviso de cidade não reconhecida.
- Dois prestadores com "Centro" na mesma cidade apontam para a mesma linha de `geo_place`. "Centro" em outra cidade é outra linha.
- Com `OVERPASS_URL` apontando para um endereço inválido, salvar o perfil funciona normalmente; a cidade não entra em `geo_city`. Voltando a URL e rodando `pnpm db:places`, entra.
- No log do servidor, as consultas ao Overpass nunca saem em paralelo nem com menos de 1 s entre elas (logar o horário em desenvolvimento para conferir, e remover o log depois).

---

## T3.3 — Localização do cliente (AT11)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/browser-location.ts` | novo (browser): invólucro de `navigator.geolocation` e da Permissions API |

A parte de servidor (descobrir a cidade a partir das coordenadas) é `nearestMunicipality`, da T3.2, exposta por uma action na T3.4.

### `src/lib/browser-location.ts`

```ts
export type BrowserLocationFailure = "unsupported" | "denied" | "unavailable" | "timeout";

export type BrowserLocationResult =
  | { ok: true; coords: Coordinates }   // já arredondadas com roundCoordinates
  | { ok: false; reason: BrowserLocationFailure };

export function getBrowserLocation(): Promise<BrowserLocationResult>;

// "granted" só quando o navegador confirma que a permissão já foi dada.
// Navegador sem Permissions API devolve "unknown".
export function getLocationPermission(): Promise<"granted" | "prompt" | "denied" | "unknown">;

export const BROWSER_LOCATION_MESSAGES: Record<BrowserLocationFailure, string>;
```

- `navigator.geolocation.getCurrentPosition` com `{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }`. O raio parte da localização exata do cliente, então pede-se a melhor precisão disponível.
- Sem `navigator.geolocation` (ou fora de contexto seguro) → `unsupported`.
- As coordenadas ficam apenas no estado do componente. Nada de `localStorage`, `sessionStorage`, cookie ou URL.
- O arredondamento para 3 casas (~110 m) é feito antes de sair do browser. É bem menor que o menor raio (2 km) e que a imprecisão de medir até o centro de um bairro.

**Quando a localização é pedida** (opção B; regra usada na T3.6):

| Situação ao abrir a página | O que acontece |
|---|---|
| Permissão `granted` (dada em visita anterior) | `getBrowserLocation()` roda sozinho, sem aviso do navegador; a cidade padrão é detectada e o modo distância fica ativo |
| `prompt` ou `unknown` | Nada é pedido. O aviso do navegador só aparece quando o cliente clica no botão de localização ou escolhe "Distância" nos filtros |
| `denied` | Nada é pedido. A tela começa sem modo e sem cidade |

| Motivo | Mensagem |
|---|---|
| `unsupported` | Seu navegador não informa a localização. Escolha a cidade e o bairro. |
| `denied` | Você não permitiu o acesso à localização. Escolha a cidade e o bairro para buscar. |
| `unavailable` | Não foi possível obter sua localização agora. Escolha a cidade e o bairro. |
| `timeout` | A localização demorou demais para responder. Tente de novo ou escolha um bairro. |

### Aceite

- `pnpm typecheck` e `pnpm lint` passam. `browser-location.ts` não importa nada de servidor.
- O comportamento é conferido na T3.6 e no roteiro da T3.8.

---

## T3.4 — Queries e actions de busca (AT11)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/provider-search.ts` | novo (só servidor): as queries |
| `src/lib/geo-actions.ts` | novo (`"use server"`): `listStateCities`, `listCityNeighborhoods`, `detectCity` |
| `src/app/buscar/actions.ts` | novo (`"use server"`): `searchProviders` |
| `src/db/seed-demo.ts` | novo: dados de demonstração |
| `package.json` | script `"db:seed:demo": "tsx --env-file=.env src/db/seed-demo.ts"` |
| `README.md`, `CLAUDE.md` | comando novo |

As actions de cidade e bairro ficam em `src/lib/geo-actions.ts` porque a T3.9 as reutiliza no cadastro do prestador.

### `src/lib/provider-search.ts`

```ts
export async function findProvidersByDistance(params: {
  category: string; coords: Coordinates; radiusKm: number; sort: SearchSort;
}): Promise<{ providers: ProviderSearchItem[]; truncated: boolean }>;

export async function findProvidersByPlace(params: {
  category: string;
  place: { placeId: string; neighborhood: string; coords: Coordinates | null };
  clientCoords: Coordinates | null;
}): Promise<{ providers: ProviderSearchItem[]; truncated: boolean }>;

export async function getSearchPlace(placeId: string): Promise<{
  placeId: string; neighborhood: string; city: string; cityKey: string; state: string;
  coords: Coordinates | null;   // só para origin "osm"; null nos demais
} | null>;

// Todos os bairros da cidade em geo_place, com a contagem de prestadores.
export async function listNeighborhoodsOfCity(
  state: string, cityKey: string, category: string | null,
): Promise<SearchNeighborhood[]>;
```

**`findProvidersByDistance`**: uma query com `sql` do Drizzle, nesta forma:

- `provider_profile` ⨝ `provider_service` (categoria pedida) ⨝ `provider_area` ⨝ `geo_place` com `lat IS NOT NULL`;
- pré-filtro `geo_place.lat BETWEEN minLat AND maxLat AND geo_place.lng BETWEEN minLng AND maxLng`, com a caixa calculada por `boundingBox` em TypeScript e passada como parâmetros;
- distância Haversine calculada em SQL para cada área que passou no pré-filtro, com a mesma fórmula e o mesmo raio da Terra de `geo.ts` (`EARTH_RADIUS_KM` entra como parâmetro, não como número repetido no SQL);
- agrupamento por prestador: `min(distância)` e o nome do bairro dessa menor distância;
- `HAVING min(distância) <= raio`;
- `ORDER BY` da T3.5; `LIMIT 51`.

Bairros com coordenada aproximada (sede do município) participam como os demais.

**`findProvidersByPlace`**: mesma junção, sem `geo_place`, com `provider_area.place_id = placeId`. Todos os resultados atendem o mesmo bairro, então `neighborhood` é o nome dele e `distanceKm` é o mesmo para todos: `haversineKm(clientCoords, place.coords)` calculado uma vez em TypeScript, ou `null` se faltar qualquer um dos dois. Ordenação da T3.5; `LIMIT 51`.

Nas duas:

- Pedir 51 linhas e devolver 50: se vier a 51ª, `truncated = true`.
- Selecionar as colunas uma a uma. `phone`, `phone_is_whatsapp` e `user_id` não entram.
- As categorias de cada prestador (para os badges do card) vêm em uma segunda query com `inArray` pelos ids retornados, ordenadas por `sortOrder`. Sem consulta por linha.
- Todos os valores entram como parâmetros do `sql`; nada é concatenado.

**`listNeighborhoodsOfCity`**: todas as linhas de `geo_place` da cidade, com `providerCount` = prestadores distintos ligados ao lugar que têm a categoria dada (ou qualquer categoria, se `null`). `LEFT JOIN`, para os bairros sem prestador virem com 0. Ordem: primeiro os que têm prestador, depois os demais; dentro de cada grupo, alfabética.

Na T3.4 a ordenação por distância é só distância crescente e, no desempate, nome. A T3.5 completa.

### Server actions

Nenhuma chama `requireSession`: a busca é pública. Nenhuma loga o que recebeu.

```ts
// src/lib/geo-actions.ts
"use server";
export async function listStateCities(state: string): Promise<SearchCity[]>;
export async function listCityNeighborhoods(input: {
  state: string; cityKey: string; category?: string;
}): Promise<CityNeighborhoodsResult>;
export async function detectCity(input: unknown): Promise<SearchCity | null>;

// src/app/buscar/actions.ts
"use server";
export async function searchProviders(input: SearchInput): Promise<SearchProvidersResult>;
```

`listStateCities`: `state` fora de `BRAZILIAN_STATES` → lista vazia. Caso contrário, `listMunicipalities(state)`. Não toca no banco.

`listCityNeighborhoods`:

1. Conferir `typeof` dos campos; `state` em `BRAZILIAN_STATES`; `cityKey` e `category` com tamanho limitado. Fora disso, `{ neighborhoods: [], mapStatus: "unknown-city" }`.
2. `mapStatus = await ensureCityNeighborhoods(db, …)`. Na primeira vez de uma cidade, isso consulta o mapa e demora alguns segundos.
3. `neighborhoods = await listNeighborhoodsOfCity(…)`, qualquer que seja o `mapStatus`: se o mapa falhou, vêm ao menos os bairros que os prestadores cadastraram.
4. Erro inesperado: `console.error` e `{ neighborhoods: [], mapStatus: "unavailable" }`.

`detectCity`: `parseCoordinatesInput`; inválido → `null`. Válido → `nearestMunicipality`, devolvendo só `state`, `cityKey` e `city`. Não toca no banco nem em serviço externo.

`searchProviders`:

1. `parseSearchInput(input)`. Erro → `{ ok: false, fieldErrors }`.
2. Conferir que a categoria existe em `service_category`. Se não, `fieldErrors.category = "Escolha um serviço da lista."`.
3. Origem `place`: `getSearchPlace(placeId)`; se não existir, `fieldErrors.place = "Escolha um bairro da lista."`. Depois `findProvidersByPlace`, repassando as coordenadas do cliente se vieram.
4. Origem `coords`: `findProvidersByDistance`.
5. Devolver `{ ok: true, origin, providers, truncated }`. As coordenadas do cliente não voltam na resposta.
6. Erro inesperado: `console.error` com uma mensagem fixa e o erro, **sem** o `input` (para não logar coordenadas), e `{ ok: false, fieldErrors: {}, formError: "Não foi possível buscar agora. Tente de novo." }`.

### Dados de demonstração: `pnpm db:seed:demo`

- Cria cerca de 14 prestadores fictícios: linhas em `user` com e-mail `demo-NN@serviaqui.invalid` e sem linha em `account` (não dá para entrar com elas), mais perfil, serviços e áreas. Misturar nomes de pessoa e de empresa ("Carlos Elétrica", "Val Reparos").
- Grava os bairros das tabelas abaixo em `geo_place` com `origin = "osm"` e as coordenadas dadas, e grava São Paulo/SP e Campinas/SP em `geo_city` como já carregadas. Com isso, a busca nessas duas cidades **não consulta o Overpass** e a lista de bairros delas é exatamente a do seed.
- Telefone fictício fixo no formato válido.
- Idempotente: usa ids fixos (`demo-user-01`, `demo-provider-01`, …) e `onConflictDoUpdate`. Rodar de novo regrava os mesmos dados.
- Com `--clean`, apaga os usuários `demo-user-*` (a cascata leva o resto), as linhas de `geo_city` das duas cidades e os lugares delas que não tenham área ligada, e sai. Depois disso, a próxima busca nessas cidades carrega os bairros reais do mapa.
- Requer `pnpm db:seed` antes (usa as categorias).

Coordenadas aproximadas, só para demonstração. O que importa é que são fixas: os resultados esperados no roteiro da T3.8 são calculados a partir delas com `haversineKm`.

São Paulo/SP:

| Bairro | Latitude | Longitude | Prestadores |
|---|---|---|---|
| Sé | −23,5505 | −46,6333 | sim |
| Bela Vista | −23,5614 | −46,6559 | sim |
| Pinheiros | −23,5670 | −46,7020 | sim |
| Vila Mariana | −23,5892 | −46,6344 | sim |
| Mooca | −23,5606 | −46,5997 | sim |
| Tatuapé | −23,5403 | −46,5766 | sim |
| Santana | −23,5016 | −46,6258 | sim |
| Lapa | −23,5275 | −46,7044 | sim |
| Santo Amaro | −23,6522 | −46,7108 | sim |
| Itaquera | −23,5360 | −46,4555 | sim |
| Liberdade | −23,5596 | −46,6328 | não |
| Consolação | −23,5530 | −46,6590 | não |
| Butantã | −23,5717 | −46,7081 | não |

Campinas/SP:

| Bairro | Latitude | Longitude | Prestadores |
|---|---|---|---|
| Centro | −22,9056 | −47,0608 | sim |
| Cambuí | −22,8920 | −47,0490 | sim |
| Taquaral | −22,8740 | −47,0500 | não |

Distribuição mínima para os cenários:

- pelo menos 4 eletricistas em bairros diferentes de São Paulo, um deles com 2 bairros;
- 2 diaristas no mesmo bairro;
- 1 categoria com um único prestador distante (Itaquera);
- 1 categoria sem nenhum prestador;
- 2 prestadores em Campinas, um deles eletricista;
- 1 prestador de São Paulo cujo único bairro não está no mapa ("Jardim Inexistente": `origin = "provider"`, coordenada da sede de São Paulo), para conferir o bairro com localização aproximada;
- valores por hora variados, e um prestador com "Valor a combinar".

### Aceite

- `pnpm db:seed && pnpm db:seed:demo` roda duas vezes sem duplicar. `pnpm db:seed:demo --clean` remove tudo o que o script criou e nada mais.
- Para uma origem e um raio do roteiro, a distância devolvida pela query bate com `haversineKm` das mesmas coordenadas com diferença menor que 10 m (conferir uma vez, com um script descartável ou no Studio).
- Um prestador com dois bairros dentro do raio aparece uma vez só, com o mais próximo.
- `listNeighborhoodsOfCity` de São Paulo devolve os 13 bairros do seed mais "Jardim Inexistente"; os que têm prestador vêm primeiro; Liberdade, Consolação e Butantã vêm com `providerCount = 0`. Com a categoria "eletricista", só contam os eletricistas.
- `listCityNeighborhoods` de São Paulo não consulta o Overpass (conferir no log). Para uma terceira cidade real, consulta uma vez; na segunda chamada, não consulta.
- `detectCity` com as coordenadas da Sé devolve São Paulo; com as do Cambuí, Campinas.
- `listStateCities("SP")` devolve 645 cidades em ordem alfabética.
- O payload das actions (aba Network, na T3.6) não contém telefone nem as coordenadas enviadas.

---

## T3.5 — Ordenação por avaliação e distância (AT12)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/db/schema.ts` | `rating_average` e `rating_count` em `provider_profile` |
| `src/lib/ranking.ts` | novo (puro): critério e constantes |
| `src/lib/ranking.test.ts` | novo; incluir no script `test` |
| `src/lib/provider-search.ts` | `ORDER BY` conforme o modo e a ordenação pedida |
| `src/db/seed-demo.ts` | notas fictícias em alguns prestadores |

### Schema

Em `provider_profile`:

```ts
ratingAverage: doublePrecision("rating_average"),            // null enquanto não houver avaliação
ratingCount: integer("rating_count").default(0).notNull(),
```

Nesta fase ninguém escreve nessas colunas além do seed de demonstração. A T5.3 passa a recalculá-las a cada avaliação.

### Critério

**Nota ajustada** (média bayesiana):

```
ajustada = (C · m + média · n) / (C + n)        com C = 5 e m = 4,0
```

`n` é `rating_count` e `média` é `rating_average`. Com `n = 0` a nota ajustada é `m`: prestador novo entra como "4,0 provisório", nem no topo nem no fim. Uma nota 5 isolada vale 4,17; cinquenta notas com média 4,8 valem 4,73.

**Ordenações:**

| Modo | Opção | 1º critério | 2º | 3º |
|---|---|---|---|---|
| Distância | `distancia` (padrão), "Mais próximos" | distância crescente, arredondada para 0,1 km | nota ajustada decrescente | nome |
| Distância | `avaliacao`, "Melhor avaliados" | nota ajustada decrescente, arredondada para 0,01 | distância crescente | nome |
| Bairro | (sem escolha) | nota ajustada decrescente | nome | — |

O arredondamento é o que faz o segundo critério valer: sem ele, dois prestadores a 2,31 e 2,34 km nunca empatariam e a nota nunca decidiria.

No modo bairro todos os resultados estão no mesmo bairro, então a distância não diferencia ninguém: o seletor de ordenação não aparece e o parâmetro `sort` é ignorado.

### `src/lib/ranking.ts`

```ts
export const RATING_PRIOR_MEAN = 4.0;
export const RATING_PRIOR_WEIGHT = 5;

export function adjustedRating(average: number | null, count: number): number;

export function compareProviders(
  sort: SearchSort,
): (a: ProviderSearchItem, b: ProviderSearchItem) => number;
```

A ordenação que vale é a do SQL (por causa do `LIMIT`). `compareProviders` existe para os testes unitários definirem o critério e para a conferência do aceite: ordenar em memória o resultado de uma busca tem que dar a mesma ordem. As constantes entram no SQL como parâmetros vindos deste módulo.

### Testes unitários

- `adjustedRating`: sem avaliações → 4,0; (5,0; 1) → 4,17; (4,8; 50) → 4,73; (1,0; 1) → 3,5; `average` nulo com `count` > 0 tratado como sem avaliações.
- `compareProviders("distancia")`: mais perto vem antes; 2,31 e 2,34 km empatam e decide a nota; empate total decide o nome.
- `compareProviders("avaliacao")`: 4,8 com 50 avaliações vem antes de 5,0 com 1; prestador novo (4,0) vem antes de 3,0 com 20 avaliações; empate decide a distância.
- Itens com a mesma distância (ou todos com `distanceKm` nulo): nota ajustada e depois nome, nas duas opções.

### Aceite

- `pnpm db:push` adiciona as duas colunas sem pedir confirmação.
- Com as notas do seed de demonstração, a mesma busca por distância devolve ordens diferentes em "Mais próximos" e "Melhor avaliados", e as duas batem com `compareProviders` aplicado ao mesmo resultado.
- Editar `rating_average`/`rating_count` de um prestador no Studio muda a posição dele na busca seguinte.
- As regras desta seção são o entregável da AT12.

---

## T3.6 — Tela `/buscar` (AT13)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/buscar/page.tsx` | novo (server) |
| `src/app/buscar/search-form.tsx` | novo (client): barra, painel de filtros, estado e resultados |
| `src/components/provider-card.tsx` | novo: card de resultado |
| `src/components/searchable-list.tsx` | novo: campo de filtro + lista de opções |
| `src/components/ui/popover.tsx` | `pnpm dlx shadcn@latest add popover` |
| `src/app/design/page.tsx`, `demos.tsx` | `ProviderCard` e `SearchableList` na vitrine |
| `src/app/page.tsx` | redirecionar logado para `/buscar`; busca rápida no hero |
| `src/lib/redirect.ts` | `DEFAULT_REDIRECT = "/buscar"` |
| `src/components/site-header.tsx` | link "Buscar" |
| `src/app/dashboard/page.tsx` | card "Encontre serviços" |
| `docs/testes/autenticacao.md`, `docs/testes/perfil-prestador.md` | trocar `/dashboard` por `/buscar` nos casos que conferem o destino padrão depois do login |
| `CLAUDE.md` | estrutura, componentes novos, "estado atual", convenções da busca |

`/buscar` não entra no `matcher` do proxy.

### Página

`page.tsx`:

- `searchParams` é uma `Promise` no Next 16: `const params = await searchParams`.
- `listServiceCategories()`. Se vier vazia, mesmo aviso do formulário de prestador (rodar `pnpm db:seed`).
- Lê `servico`, `ordem`, `raio` e `local`. Valores inválidos ou ausentes viram o padrão, sem erro. Só o primeiro valor de cada parâmetro conta.
- Se `local` vier preenchido: `getSearchPlace(local)`. Existindo, a página passa cidade e bairro iniciais ao formulário. Não existindo, o parâmetro é ignorado.
- `metadata`: título "Buscar prestadores | ServiAqui".
- Renderiza `SiteHeader` (sem mudança de layout), um `h1` "Encontre um prestador" e o `SearchForm`.
- Rodapé da página, discreto: "Bairros: © OpenStreetMap", com link para `https://www.openstreetmap.org/copyright`.

### Layout

Pelo esboço do autor: uma barra de busca compacta no topo e, abaixo, a lista de prestadores em coluna única. Conteúdo centralizado com `max-w-2xl`, no celular e no desktop.

**Barra de busca**, em uma linha só, inclusive no celular:

| Posição | Controle | Detalhe |
|---|---|---|
| Esquerda | Botão de localização (`MapPinIcon`) | Pede a localização do cliente. Só ícone, com `aria-label` "Usar minha localização". Com a localização ativa, usa a cor primária e o `aria-label` vira "Localização ativa. Atualizar." |
| Centro | Serviço | `Select` com as categorias, na ordem do seed. Ocupa o espaço que sobra (`flex-1`). Obrigatório |
| Direita | Botão de filtros (`ListFilterIcon` + resumo) | Abre o painel "Filtros". O resumo mostra o filtro atual: "5 km" no modo distância, o nome do bairro no modo bairro (truncado com reticências), "Filtros" quando nada foi escolhido |

**Painel "Filtros"** (`Popover`, ancorado no botão; no celular ocupa a largura da tela). Tem três telas internas, uma por vez:

*Tela principal:*

| Ordem | Controle | Detalhe |
|---|---|---|
| 1 | Cidade | Botão com a cidade atual ("Campinas/SP") ou "Escolher cidade". Abre a tela de cidade |
| 2 | Buscar por | Duas opções exclusivas (grupo de rádio estilizado como segmentos): "Distância" e "Bairro" |
| 3a | Distância (só no modo distância) | Quatro opções exclusivas: 2, 5, 10 e 20 km. Abaixo, texto de apoio: "A partir da sua localização atual." |
| 3b | Bairro (só no modo bairro) | Botão com o bairro atual ou "Escolher bairro". Abre a tela de bairro. Desabilitado sem cidade, com o texto "Escolha a cidade primeiro." |
| 4 | Ordenar por (só no modo distância) | `Select`: "Mais próximos", "Melhor avaliados" |

*Tela de cidade:* botão "Voltar", `Select` de UF (27 siglas) e `SearchableList` com as cidades da UF (`listStateCities`, guardadas em memória por UF depois da primeira vez). Escolher uma cidade volta para a tela principal.

*Tela de bairro:* botão "Voltar", o nome da cidade e `SearchableList` com os bairros (`listCityNeighborhoods`). Escolher um bairro fecha o painel.

- Na tela principal, escolher uma opção aplica na hora; não há botão de confirmar.
- O painel fecha com Esc e com clique fora, devolve o foco ao botão de filtros e é navegável por teclado. Ao trocar de tela interna, o foco vai para o primeiro controle da nova tela.

**Como cada bairro aparece na lista** (definido pelo autor):

| Situação | Visual |
|---|---|
| Tem prestador do serviço escolhido | Texto normal, com a quantidade à direita ("3") |
| Não tem | Texto `text-muted-foreground`, com "sem prestadores" à direita em fonte menor. Continua selecionável, com foco e hover iguais aos demais |

A diferença não fica só na cor: o texto "sem prestadores" está sempre lá. Os bairros com prestador vêm primeiro. Sem serviço escolhido, a contagem considera qualquer serviço.

### `SearchableList`

Componente de domínio reutilizável: um `Input` de filtro e, abaixo, uma lista de opções de seleção única.

```ts
type SearchableListProps = {
  options: { value: string; label: string; hint?: string; muted?: boolean }[];
  value: string | null;
  onChange: (value: string) => void;
  filterPlaceholder: string;
  filterLabel: string;      // rótulo acessível do campo
  emptyMessage: string;     // quando o filtro não acha nada
  loading?: boolean;
};
```

- O filtro compara por `neighborhoodKey` (sem acento, sem caixa) e casa em qualquer parte do `label`.
- A lista é um `listbox`: setas movem, Enter escolhe, o item escolhido tem `aria-selected`. Rolagem com altura máxima de cerca de 6 itens.
- No máximo 100 opções são desenhadas de cada vez. Havendo mais, a última linha é o texto "Digite para ver mais." (São Paulo tem mais de 600 bairros; Minas Gerais, 853 cidades).
- `loading`: três linhas de `Skeleton` no lugar das opções.
- `hint` aparece à direita; `muted` aplica o visual apagado.

### Comportamento

Estado do formulário: serviço, modo (`distancia`, `bairro` ou indefinido), coordenadas (ou nenhuma), cidade, bairro (`placeId`), raio, ordenação.

1. **Ao abrir:**
   - URL com `local` válido → modo bairro, com cidade e bairro preenchidos. Se também houver `servico`, a busca roda sozinha.
   - Caso contrário, `getLocationPermission()`. Se `granted`: `getBrowserLocation()`, depois `detectCity(coords)`; a cidade detectada entra no seletor e o modo vira distância. Se também houver `servico`, a busca roda sozinha.
   - Nos demais casos, o modo fica indefinido e nada é pedido ao navegador.
2. **Botão de localização (pin):** `getBrowserLocation()`. Sucesso → guarda as coordenadas, `detectCity`, define a cidade, muda para o modo distância e, se houver serviço, busca. Falha → mensagem da T3.3 em `role="alert"` abaixo da barra, modo bairro, painel "Filtros" aberto com o foco no botão de cidade.
3. **Escolher "Distância" no painel sem ter coordenadas:** mesmo fluxo do pin.
4. **Trocar a cidade:** limpa o bairro escolhido e muda para o modo bairro. Se a cidade for diferente da detectada pela localização, aparece na tela principal do painel o texto "A busca por distância usa sua localização atual. Para outra cidade, escolha o bairro." Voltar para "Distância" continua possível e busca a partir da localização, independentemente da cidade no seletor.
5. **Abrir a tela de bairro:** carrega os bairros da cidade com `listCityNeighborhoods`, passando o serviço escolhido, se houver. A lista é recarregada quando a cidade ou o serviço mudam.
6. **Quando a busca roda:** sempre que houver serviço e uma origem completa (modo distância com coordenadas, ou modo bairro com bairro escolhido) e algum destes mudar: serviço, modo, raio, ordenação, bairro, coordenadas. Não existe botão "Buscar" na tela.
7. **Busca por bairro com localização conhecida:** as coordenadas vão junto na origem `place`, só para os cards mostrarem a distância. Sem localização, a busca por bairro funciona igual e os cards mostram só o bairro. A busca por bairro nunca pede a localização.
8. **Escolher o serviço sem origem definida:** não busca; abre o painel "Filtros".
9. **Escolher origem sem serviço:** não busca; o seletor de serviço mostra "Escolha o serviço que você procura." e recebe o foco quando o painel fecha.
10. A busca chama `searchProviders` dentro de `startTransition`.
11. A cada busca feita, atualizar a URL com `window.history.replaceState` (sem navegação nem nova renderização no servidor): `servico` sempre; no modo distância, `raio` e `ordem`; no modo bairro, `local`. Coordenadas nunca entram.
12. Uma resposta que chega depois de outra chamada mais nova ter sido disparada é descartada (guardar um contador de requisição em `useRef`). Vale para a busca, para a lista de bairros e para a lista de cidades.

### Resultados

Acima da lista, uma linha de resumo em `aria-live="polite"`:

| Modo | Texto |
|---|---|
| Distância | "{n} prestadores de {serviço} a até {raio} km de você" |
| Bairro | "{n} prestadores de {serviço} em {bairro}, {cidade}/{UF}" |

Singular quando `n = 1`. Com `truncated`, acrescentar "Mostrando os 50 primeiros."

Lista em coluna única, um card por linha, em todas as larguras de tela.

### `ProviderCard`

Props: um `ProviderSearchItem` e, opcional, `highlightSlug` (a categoria buscada).

O card mostra, nesta ordem de importância: **nome** (da pessoa ou da empresa), **preço** e **bairro/distância**. O resto é secundário.

- Card horizontal, em formato de linha. O card inteiro é um link para `/prestador/{id}` (um único `<a>`, com foco visível).
- À esquerda: `Avatar` com as iniciais.
- No meio, primeira linha: nome (`h3`). É o `displayName` do perfil, que serve tanto para pessoa quanto para empresa.
- À direita, alinhado ao nome e em destaque: o valor por hora, com `formatHourlyRate(hourlyRateCents)`. "Valor a combinar" usa `text-muted-foreground` e fonte menor, para não disputar com os valores numéricos.
- No meio, segunda linha, com `MapPinIcon`: bairro e distância.
  - `distanceKm` numérico → "{bairro} · {formatDistance}" (ex.: "Pinheiros · ≈ 2,3 km");
  - `distanceKm` nulo → só "{bairro}".
- No meio, terceira linha, discreta: reputação e serviços.
  - Reputação: com `ratingCount > 0`, `RatingStars` (`size="sm"`) mais "4,8 (12)" com vírgula decimal; com zero, `Badge` "Novo no ServiAqui". Nunca estrelas vazias.
  - Serviços como `Badge`; o de `highlightSlug` primeiro e com a variante de destaque. Mais de 2: mostra 2 e "+N".
- Só tokens semânticos. Entra em `/design` com três exemplos: com nota e distância; novo com "Valor a combinar"; sem distância (só bairro).

### Home, cabeçalho e dashboard

- **Página inicial por sessão.** `src/app/page.tsx` chama `getSession()`: com sessão, `redirect("/buscar")`; sem sessão, renderiza a home atual. O `Logo` continua apontando para `/`, então clicar nele estando logado leva à busca.
- **Destino padrão depois do login.** `DEFAULT_REDIRECT` em `src/lib/redirect.ts` passa a ser `"/buscar"`. Isso muda, de uma vez, o destino de quem entra ou cria conta sem `redirectTo` e o de `redirectIfAuthenticated()` (logado abrindo `/sign-in`, `/sign-up` ou `/forgot-password`). Um `redirectTo` explícito continua valendo: "Quero oferecer serviços" segue levando a `/dashboard/prestador`, e uma rota protegida aberta sem sessão segue voltando para ela depois do login.
- O formulário de prestador continua indo para `/dashboard` depois de salvar (é `router.push` explícito, não o padrão).
- Conferir os outros usos de `DEFAULT_REDIRECT` e de `"/dashboard"` fixo no código (`grep`) e ajustar só os que significam "página inicial do logado". O link "Minha conta" do cabeçalho continua em `/dashboard`.
- Hero da home (só deslogado): acima dos botões de conta, um formulário pequeno (server, `<form action="/buscar" method="get">`) com um `<select name="servico">` nativo estilizado com as classes do design system e um botão "Buscar". Funciona sem JavaScript. As categorias vêm de `listServiceCategories()`; se vierem vazias, o formulário some.
- `SiteHeader`: link "Buscar" (`variant="ghost"`) antes dos botões de conta, para logado e deslogado. O resto do cabeçalho fica como está.
- `/dashboard`: card novo "Encontre serviços", entre "Sua conta" e o card do prestador, no mesmo formato do card "Ofereça seus serviços". Descrição "Busque prestadores que atendem perto de você." e botão "Buscar prestadores" → `/buscar`. Aparece para toda conta, com ou sem perfil de prestador: a mesma pessoa pode contratar e prestar serviço.
- Página pública do prestador: sem mudança.

### Aceite

- Deslogado (janela anônima), `/buscar` abre e busca normalmente.
- Primeira visita (permissão ainda não decidida): o navegador não pede nada ao abrir. Clicar no pin pede a permissão; permitindo, a cidade aparece no painel, o resumo dos filtros mostra o raio e, com serviço escolhido, a lista aparece.
- Recarregando a página depois de permitir, a localização é usada sozinha e a cidade já vem escolhida.
- Com a localização simulada na Sé (DevTools → Sensors) e o seed de demonstração: a cidade padrão é São Paulo/SP; eletricista em 5 km lista os prestadores esperados (roteiro da T3.8), cada um com nome, valor, bairro mais próximo e distância.
- Negando a permissão: aparece a mensagem, o painel abre no modo bairro e o foco vai para o botão de cidade.
- Na tela de cidade: escolher "SP" e digitar "camp" mostra Campinas (e outras com "camp" no nome); "sao paulo" sem acento acha São Paulo. Escolher uma cidade pequena qualquer do Brasil funciona.
- Na tela de bairro de São Paulo (seed): aparecem os bairros com prestador primeiro, com a quantidade; Liberdade, Consolação e Butantã aparecem apagados com "sem prestadores" e são clicáveis. Digitar "liber" deixa só Liberdade; "SE" acha "Sé".
- Escolher Liberdade com eletricista mostra a lista vazia com "Infelizmente ainda não temos prestadores nessa região." (T3.7).
- Trocar o serviço e reabrir a tela de bairro muda as quantidades.
- Em uma cidade real fora do seed, a primeira abertura da tela de bairro mostra o carregamento e depois os bairros do mapa; a segunda abre na hora.
- Busca por bairro com a localização ativa: os cards mostram o bairro e a distância até ele. Sem localização: só o bairro, e o navegador não pede permissão.
- No modo bairro, "Ordenar por" e as opções de raio não aparecem.
- Trocar o raio ou a ordenação refaz a busca sem outro clique.
- A URL de uma busca por bairro tem `servico` e `local`; abrir essa URL em outra aba repete a busca sozinha. A URL de uma busca por distância não tem coordenadas.
- Parâmetros adulterados (`raio=7`, `ordem=x`, `servico=nao-existe`, `local=nao-existe`) não quebram a página.
- Nas requests (aba Network), as coordenadas aparecem só no corpo das chamadas das actions, com 3 casas decimais. Nenhuma request sai do browser para serviço de mapa.
- Um card leva à página pública do prestador. O telefone não aparece na tela nem nas respostas.
- Logado, abrir `/` ou clicar no logo leva a `/buscar`; a tela de "Criar conta grátis / Já tenho conta" não aparece. Deslogado, `/` mostra a home.
- Entrar ou criar conta sem `redirectTo` termina em `/buscar`. Logado, abrir `/sign-in` leva a `/buscar`. Deslogado, abrir `/dashboard` leva ao login e, depois de entrar, volta para `/dashboard`.
- A busca da home (deslogado) leva a `/buscar?servico=…` com o serviço já escolhido.
- O card "Encontre serviços" aparece em `/dashboard` para conta com e sem perfil de prestador, e o botão leva a `/buscar`.
- Navegação só por teclado: dá para escolher serviço, abrir o painel, trocar UF e cidade, filtrar e escolher bairro, voltar entre as telas do painel, fechar e abrir um resultado; o foco é sempre visível.
- Em 360 px de largura a barra de busca cabe em uma linha, sem rolagem horizontal, e nome e valor de cada card cabem na mesma linha (nome longo trunca com reticências; o valor nunca quebra). No desktop o conteúdo fica centralizado e a lista continua com uma coluna.
- `ProviderCard` e `SearchableList` aparecem em `/design`. `pnpm build` passa.

---

## T3.7 — Estados vazio, carregando e erro (AT13)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/buscar/search-form.tsx` | estados |
| `src/components/provider-card.tsx` | `ProviderCardSkeleton` |
| `src/app/design/demos.tsx` | esqueleto na vitrine |

### Estados

| Estado | Quando | O que aparece |
|---|---|---|
| Inicial | Nenhuma busca feita | Texto de apoio: "Escolha um serviço e use sua localização, ou escolha um bairro nos filtros." Sem lista |
| Obtendo localização | Entre o pedido e a resposta do browser | Pin desabilitado com indicador de carregamento e texto "Obtendo localização..." abaixo da barra (`aria-live`) |
| Carregando cidades | Primeira vez de uma UF | `SearchableList` em `loading` |
| Carregando bairros | Entre abrir a tela de bairro e a lista chegar | `SearchableList` em `loading`. Passando de 2 s, acrescentar o texto "Buscando os bairros de {cidade} no mapa. Só demora na primeira vez." |
| Bairros incompletos | `mapStatus = "unavailable"` | Acima da lista (que mostra o que houver no banco): "Não foi possível carregar todos os bairros agora." e botão "Tentar de novo" |
| Cidade sem bairros no mapa | `mapStatus = "loaded"` e lista vazia | "O mapa não tem bairros cadastrados para {cidade}. Use a busca por distância." |
| Carregando resultados | Busca pendente | Quatro `ProviderCardSkeleton` na lista; região de resultados com `aria-busy="true"`. Se já havia resultados, eles ficam visíveis com opacidade reduzida em vez de sumirem |
| Vazio, por bairro | Zero resultados | "Infelizmente ainda não temos prestadores nessa região." e, abaixo, "Tente outro bairro ou busque por distância." |
| Vazio, por distância | Zero resultados | "Infelizmente ainda não temos prestadores de {serviço} a até {raio} km de você." Se houver raio maior na lista, botão "Buscar em até {próximo raio} km", que troca o raio e busca. No raio máximo: "Tente outro serviço ou escolha um bairro nos filtros." |
| Erro da busca | `formError` | Mensagem em `role="alert"` com `text-destructive` e botão "Tentar de novo", que repete a última busca |
| Erro de rede | A chamada da action lança (offline, servidor fora) | Mesma apresentação, texto "Sem conexão com o servidor. Verifique sua internet e tente de novo." |
| Erro de campo | `fieldErrors` | No próprio controle (serviço na barra; bairro no painel) |
| Localização negada ou indisponível | Falha de `getBrowserLocation` | Mensagens da T3.3, abaixo da barra |

- Nenhum estado usa só cor para comunicar: sempre há texto.
- O resumo em `aria-live` anuncia também o estado vazio.
- `ProviderCardSkeleton` usa o `Skeleton` do shadcn com as mesmas dimensões do card, para a lista não pular quando os resultados chegam.

### Aceite

- Com a rede limitada no DevTools ("Slow 4G"), os esqueletos aparecem e a altura de cada item não muda quando os cards entram.
- Escolher um bairro sem prestadores mostra "Infelizmente ainda não temos prestadores nessa região."
- Uma categoria sem prestadores, por distância, mostra o vazio com o botão de ampliar; clicar nele busca com o raio seguinte. Em 20 km o botão não aparece.
- Com `OVERPASS_URL` inválida e uma cidade ainda não carregada: a tela de bairro mostra o aviso de bairros incompletos e "Tentar de novo"; corrigindo a URL e clicando, os bairros aparecem.
- Com o banco parado (`pnpm db:down`), a busca mostra o erro com "Tentar de novo"; subindo o banco e clicando, funciona.
- Com o DevTools em "Offline", aparece a mensagem de conexão.
- Disparar duas buscas em sequência rápida (trocar o raio duas vezes) termina sempre com o resultado da última.

---

## T3.8 — Cenários de teste de bairro/raio (AT14)

### Arquivos

| Arquivo | Ação |
|---|---|
| `docs/testes/busca.md` | novo |
| `README.md`, `CLAUDE.md` | apontar para o roteiro |

### Roteiro manual

Mesmo formato dos outros roteiros: pré-requisitos, tabelas com ID, pré-condição, passos, resultado esperado, coluna "OK / Falhou" e registro de execução no fim. A numeração continua a da Fase 2 (CT-47 em diante).

Pré-requisitos: `pnpm db:push`, `pnpm db:seed`, `pnpm db:seed:demo`, `GEO_USER_AGENT` preenchido no `.env`. A localização é simulada no DevTools (Sensors), nas coordenadas dos bairros do seed.

O roteiro traz uma tabela "Dados de demonstração" com cada prestador, serviços, bairros, valor e nota, e uma matriz de distâncias entre os bairros do seed, calculada com `haversineKm`. Os resultados esperados dos cenários de raio saem dessa matriz; quem escreve o roteiro preenche os nomes e os valores exatos.

**Busca por distância (raio)**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-47 | Localização na Sé, eletricista, 2 km | Só os prestadores com bairro a até 2 km da Sé, conforme a matriz |
| CT-48 | Mesma busca, 5 km | Os do CT-47 mais os que entram entre 2 e 5 km |
| CT-49 | Mesma busca, 20 km | Todos os eletricistas de São Paulo a até 20 km; nenhum de Campinas |
| CT-50 | Prestador com dois bairros, um dentro e um fora do raio | Aparece uma vez, com o bairro de dentro e a distância dele |
| CT-51 | Localização exatamente no centro de um bairro atendido | Prestador no topo em "Mais próximos", com "≈ 100 m" |
| CT-52 | Prestador na borda (escolher raio e par de pontos com distância logo abaixo e logo acima) | O de dentro aparece, o de fora não |
| CT-53 | Categoria cujo único prestador está em Itaquera, localização na Lapa, 20 km | Vazio, sem botão de ampliar (raio máximo) |
| CT-54 | Categoria sem nenhum prestador, 5 km | Vazio com "Buscar em até 10 km" |
| CT-55 | Prestador do "Jardim Inexistente" (bairro fora do mapa), localização na Sé, 2 km | Aparece, com a distância até o centro da cidade (localização aproximada) |

**Localização e cidade padrão**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-56 | Primeira visita, sem clicar em nada | O navegador não pede permissão |
| CT-57 | Clicar no pin e permitir, localização na Sé | Cidade "São Paulo/SP" no painel; modo distância; URL sem coordenadas |
| CT-58 | Recarregar depois de permitir | Localização usada sozinha, sem aviso do navegador; cidade já escolhida |
| CT-59 | Localização no Cambuí | Cidade "Campinas/SP" |
| CT-60 | Localização em uma cidade pequena sem prestadores | A cidade certa aparece no painel; busca por distância vazia |
| CT-61 | Clicar no pin e negar | Mensagem de permissão; painel aberto no modo bairro; foco no botão de cidade |
| CT-62 | Escolher "Distância" no painel sem localização | O navegador pede a permissão nesse momento |

**Cidade e bairro**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-63 | Tela de cidade, UF "SP", digitar "camp" | Campinas na lista |
| CT-64 | Digitar "sao paulo" sem acento | São Paulo na lista |
| CT-65 | Escolher uma UF e uma cidade sem nenhum prestador | Cidade selecionada normalmente |
| CT-66 | Tela de bairro de São Paulo, eletricista | Bairros com eletricista primeiro, com a quantidade; os demais apagados, com "sem prestadores" |
| CT-67 | Digitar "vila" | Só "Vila Mariana" |
| CT-68 | Digitar "SE" e "sé" | "Sé" aparece nos dois casos |
| CT-69 | Digitar "zzz" | Mensagem de nenhum bairro com esse nome |
| CT-70 | Sem localização, escolher "Sé", eletricista | Só os eletricistas que atendem na Sé; cards com o bairro e sem distância; ordem por avaliação; o navegador não pede permissão |
| CT-71 | Com localização em Pinheiros, escolher "Sé", eletricista | Mesmos prestadores do CT-70; cards com "Sé · ≈ {distância Pinheiros–Sé da matriz}" |
| CT-72 | Escolher "Liberdade" (sem prestadores) | Bairro clicável; lista vazia com "Infelizmente ainda não temos prestadores nessa região." |
| CT-73 | Escolher a Sé com uma categoria que ninguém de lá oferece | Mesma mensagem do CT-72 |
| CT-74 | Trocar o serviço e reabrir a tela de bairro | As quantidades e o agrupamento mudam |
| CT-75 | Escolher "Jardim Inexistente" e a categoria do prestador de lá | O prestador aparece |
| CT-76 | Com localização em São Paulo, trocar a cidade para Campinas | Modo vira bairro; texto explicando que a distância usa a localização atual; bairros de Campinas |
| CT-77 | Cidade real fora do seed, primeira vez | Carregamento com a mensagem do mapa; depois, os bairros reais. Linha nova em `geo_city` |
| CT-78 | Mesma cidade, segunda vez | Lista imediata; nenhuma consulta ao Overpass no log |
| CT-79 | `OVERPASS_URL` inválida, cidade ainda não carregada | Aviso de bairros incompletos e "Tentar de novo" |
| CT-80 | Copiar a URL de uma busca por bairro e abrir em outra aba | A busca se repete sozinha, com cidade e bairro preenchidos |

**Ordenação**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-81 | Por distância, "Mais próximos" | Distância crescente; empate em 0,1 km decidido pela nota |
| CT-82 | Por distância, "Melhor avaliados" | Prestador com muitas notas boas antes de um com uma única nota 5; prestador novo no meio |
| CT-83 | Alterar a nota de um prestador no Studio e buscar de novo | A posição muda conforme o critério |

**Tela, privacidade e estados**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-84 | Abrir `/buscar` deslogado | Página abre e busca |
| CT-85 | Conferir um card com valor e um com "Valor a combinar" | Nome, valor em destaque à direita, bairro/distância abaixo do nome |
| CT-86 | URL com `raio=7&ordem=x&servico=nao-existe&local=nao-existe` | Página abre com os padrões, sem erro |
| CT-87 | Procurar o telefone de um prestador nas respostas da busca | Não aparece |
| CT-88 | Depois de uma busca por distância, procurar as coordenadas na URL, no banco e no log do servidor | Não aparecem |
| CT-89 | Aba Network do browser durante toda a sessão de busca | Nenhuma request a serviço de mapa; só ao nosso servidor |
| CT-90 | Rede lenta | Esqueletos; a lista não pula |
| CT-91 | Banco parado | Erro com "Tentar de novo"; funciona após subir o banco |
| CT-92 | Clicar em um card | Abre a página pública do prestador |
| CT-93 | Tela de 360 px | Barra em uma linha; lista em uma coluna; nome e valor na mesma linha; painel de filtros utilizável nas três telas internas |

**Página inicial e navegação**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-94 | Logado, clicar no logo "ServiAqui" e abrir `/` direto | Vai para `/buscar` nos dois casos; a home de deslogado não aparece |
| CT-95 | Entrar sem `redirectTo`; depois, logado, abrir `/sign-in` | Termina em `/buscar` nos dois casos |
| CT-96 | Deslogado, abrir `/dashboard` e entrar | Volta para `/dashboard` |
| CT-97 | Deslogado, abrir `/` | Home com "Criar conta grátis" e a busca rápida |
| CT-98 | Busca rápida da home | Chega em `/buscar` com o serviço escolhido |
| CT-99 | Logado, abrir `/dashboard` com conta sem perfil e com perfil de prestador | Card "Encontre serviços" aparece nos dois casos; o botão leva a `/buscar` |

**Lugares do cadastro**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-100 | Criar perfil em cidade real ainda não carregada | Toast imediato; em alguns segundos a cidade entra em `geo_city` e os bairros dela em `geo_place` |
| CT-101 | Perfil com bairro inventado | Lugar `provider` com a coordenada da sede; aviso no dashboard |
| CT-102 | Salvar perfil com cidade que não existe na UF | Recusado com a mensagem no campo de cidade; nada gravado. "campinas" minúsculo é aceito e vira "Campinas" |
| CT-103 | `pnpm db:places` duas vezes | A segunda não consulta o mapa e o resumo não muda |
| CT-104 | Prestador recém-criado, depois de a cidade carregar | Aparece na busca por distância e na lista de bairros da cidade, com a contagem |

### Aceite

- `pnpm test` passa.
- O roteiro foi executado por inteiro no commit final da fase, com o registro preenchido e todos os casos em "OK". Os casos de borda e de ordenação trazem os valores numéricos conferidos.
- `pnpm db:seed:demo --clean` foi rodado ao final se o banco for o de apresentação, ou os dados foram mantidos de propósito para a demonstração (registrar qual).

---

## T3.9 — Cadastro do prestador com cidades e bairros do mapa

Incremento no formulário de `/dashboard/prestador`. Não muda a busca. Três melhorias: cidade pela lista oficial, autocompletar de bairros e sugestão de bairros por referência e raio.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/provider-validation.ts` | `neighborhoodsMax: 30`; `SUGGESTION_RADII_KM`; tipos e parser da sugestão |
| `src/lib/provider-validation.test.ts` | ajustar os casos do limite (31 bairros) e cobrir o parser novo |
| `src/lib/provider-search.ts` | `listNeighborhoodsAround` |
| `src/app/dashboard/prestador/actions.ts` | conferir a cidade na lista oficial; action nova `suggestNeighborhoods` |
| `src/app/dashboard/prestador/provider-profile-form.tsx` | seletor de cidade; autocompletar de bairros; grupo "Preencher por distância" |
| `src/components/searchable-select.tsx` | novo: botão que abre um `Popover` com `SearchableList` |
| `src/components/tag-input.tsx` | prop `suggestions`; botão "Remover todos"; lista longa |
| `src/app/design/demos.tsx` | componentes novos e alterados na vitrine |
| `docs/testes/perfil-prestador.md` | atualizar os casos de cidade e do limite de 10 para 30; casos novos |
| `README.md`, `CLAUDE.md` | convenções |

### Regras

```ts
// provider-validation.ts
export const SUGGESTION_RADII_KM = [2, 5, 10] as const;
export const DEFAULT_SUGGESTION_RADIUS_KM = 5;

export type NeighborhoodSuggestionInput = { placeId: string; radiusKm: number };

export type NeighborhoodSuggestion = { name: string; key: string; distanceKm: number };

export type SuggestNeighborhoodsResult =
  | { ok: true; suggestions: NeighborhoodSuggestion[]; totalFound: number }
  | { ok: false; fieldErrors: Partial<Record<"reference" | "radiusKm", string>>; formError?: string };

export function parseNeighborhoodSuggestionInput(input: NeighborhoodSuggestionInput): /* ok + dados | fieldErrors */;
```

- `PROVIDER_LIMITS.neighborhoodsMax` passa a 30. As mensagens e dicas já saem da constante; conferir os textos fixos ("Até 10").
- A referência e o raio **não são gravados** no perfil. Servem só para preencher a lista; o que vale continua sendo a lista de bairros.
- A cidade continua guardada como texto em `provider_profile.city`, agora sempre com o nome oficial.

### Cidade pela lista oficial

- No bloco "Onde você atende", o campo de texto da cidade dá lugar a: `Select` de UF (como hoje) e `SearchableSelect` de cidade, com as cidades da UF (`listStateCities`). Trocar a UF limpa a cidade.
- A conferência no servidor já existe desde a T3.2 (`findMunicipality` em `saveProviderProfile`). Aqui só muda a mensagem, que passa a ser "Escolha uma cidade da lista.", porque o campo deixou de ser texto livre. `parseProviderProfile` continua validando só o formato (o módulo é puro e vai para o browser; a lista de municípios não).
- Perfil antigo com cidade fora da lista: o formulário abre com a UF preenchida, a cidade vazia e o erro "Escolha uma cidade da lista." já visível.
- Trocar a cidade com bairros já adicionados limpa os bairros e mostra, em `aria-live`, "Bairros removidos porque a cidade mudou."

### Autocompletar de bairros

- Escolhida a cidade, o formulário carrega os bairros dela com `listCityNeighborhoods` (a primeira vez de uma cidade consulta o mapa; mostrar o carregamento da T3.7).
- `TagInput` ganha a prop `suggestions: { value: string; label: string }[]`. Ao digitar, aparecem abaixo do campo até 8 bairros da cidade que casam com o texto (por `neighborhoodKey`, em qualquer parte do nome). Setas e Enter, ou clique, adicionam o bairro com o nome do mapa.
- Digitar um nome que não está na lista e apertar Enter continua adicionando, como hoje. Dica do campo: "Digite para buscar. Não achou? Escreva o nome e aperte Enter. Até 30."
- Se o mapa estiver indisponível, o campo funciona só com digitação livre, e aparece "Não foi possível carregar os bairros do mapa. Você pode digitar os nomes."
- Com até 30 itens: as etiquetas quebram em várias linhas sem estourar a largura no celular, e aparece um botão discreto "Remover todos" (`variant="link"`) a partir de 5 itens.

### Sugestão por referência e raio

`listNeighborhoodsAround` (em `provider-search.ts`): dado um lugar com coordenada exata (`origin = "osm"`) e um raio, devolve os lugares `osm` **da mesma cidade** dentro do raio, por distância crescente (bounding box + Haversine, como na busca), com a referência em primeiro, e o total encontrado. Como só olha a própria cidade, o raio nunca puxa bairro de cidade vizinha.

```ts
"use server";
export async function suggestNeighborhoods(input: NeighborhoodSuggestionInput): Promise<SuggestNeighborhoodsResult>;
```

1. `requireSession("/dashboard/prestador")`, fora do `try`.
2. `parseNeighborhoodSuggestionInput`: `placeId` string não vazia; raio em `SUGGESTION_RADII_KM`.
3. Buscar o lugar. Não existe, ou não tem coordenada exata → `fieldErrors.reference = "Escolha um bairro de referência da lista."`.
4. `listNeighborhoodsAround`; devolver até `neighborhoodsMax` itens e `totalFound`.
5. Erro inesperado: `console.error` e `formError = "Não foi possível sugerir os bairros agora. Adicione à mão ou tente de novo."`.

Não há chamada externa nesta action: os bairros da cidade já estão no banco desde que a cidade foi escolhida no formulário.

No formulário, entre o seletor de cidade e o campo de bairros, um grupo "Preencher por distância (opcional)":

| Controle | Detalhe |
|---|---|
| Bairro de referência | `SearchableSelect` com os bairros da cidade que têm coordenada exata. Dica: "O bairro onde você fica ou de onde sai para atender." Desabilitado sem cidade |
| Raio | `Select`: 2, 5 e 10 km ("Até 5 km"); padrão 5 |
| "Sugerir bairros" | `type="button"`, `variant="outline"`. "Buscando bairros..." enquanto pendente |

Comportamento:

1. Sem referência escolhida, clicar mostra o erro no campo e nada é chamado.
2. Sucesso: os bairros sugeridos entram no campo de bairros **já selecionados**, somados aos que já estavam, sem repetir (por `neighborhoodKey`) e sem passar de 30 no total (os que já estavam têm prioridade; depois, a ordem da sugestão, do mais perto para o mais longe).
3. Mensagem abaixo do grupo, em `aria-live="polite"`:
   - "{n} bairros adicionados. Remova os que você não atende."
   - se `totalFound` for maior que o que coube: acrescentar "O mapa tem {totalFound} bairros nesse raio; ficaram os mais próximos, até o limite de 30."
   - se só a referência voltou: "Não encontramos outros bairros nesse raio. Adicione à mão ou aumente o raio."
4. Erro: `fieldErrors` no campo; `formError` em `role="alert"` abaixo do grupo. O que já estava na lista de bairros não muda.
5. O grupo não participa do envio do formulário.
6. Nada disso é obrigatório. Deixar o grupo em branco e adicionar os bairros um a um funciona como antes.
7. Se a cidade não tem bairros no mapa, o grupo fica desabilitado, com o texto "O mapa não tem bairros cadastrados para esta cidade. Adicione os bairros à mão."

Rodapé do bloco "Onde você atende": "Bairros: © OpenStreetMap".

### `SearchableSelect`

Botão no estilo do `Select` que abre um `Popover` com um `SearchableList`. Props: as de `SearchableList`, mais `placeholder`, `id`, `disabled` e `aria-invalid`. Escolher uma opção fecha o popover e devolve o foco ao botão. Funciona dentro de `Field`, com rótulo, dica e erro.

### Testes unitários

- `parseNeighborhoodSuggestionInput`: válido; `placeId` vazio; raio fora da lista; tipos errados, sem lançar.
- `parseProviderProfile`: 30 bairros aceitos; 31 recusados com a mensagem do limite.
- A junção das sugestões com a lista atual (sem repetir, respeitando o limite, mantendo os existentes) fica em uma função pura em `provider-validation.ts`, testada com listas fixas.

### Aceite

- No formulário, escolher "SP" e digitar "camp" acha Campinas. Não é mais possível salvar uma cidade digitada livremente; adulterar o valor pelo DevTools devolve "Escolha uma cidade da lista."
- Com Campinas escolhida (seed): digitar "cam" no campo de bairros sugere "Cambuí"; Enter adiciona. Digitar "Bairro Novo" e Enter adiciona mesmo sem estar na lista.
- Referência "Centro", 5 km, "Sugerir bairros": a lista recebe os bairros de Campinas dentro do raio, com "Centro" entre eles, e a mensagem informa a quantidade. Nenhum bairro de outra cidade.
- Em uma cidade real carregada do mapa, com muitos bairros no raio, a lista para em 30 e a mensagem informa o total encontrado.
- Remover alguns e salvar grava só os que ficaram. Os lugares ligados já têm coordenada exata.
- Sugerir duas vezes seguidas não duplica bairros. Bairros adicionados antes continuam na lista.
- Trocar a cidade limpa os bairros e avisa.
- Perfil da Fase 2 com cidade fora da lista abre com o erro na cidade e pode ser corrigido e salvo.
- O 31º bairro não entra. Perfis com mais de 10 bairros salvam e reabrem corretamente.
- Deslogado, `suggestNeighborhoods` não consulta nada (redireciona para o login).
- Componentes novos e alterados aparecem em `/design`. `pnpm test`, `pnpm lint`, `pnpm typecheck` e `pnpm build` passam.

### Casos novos no roteiro `docs/testes/perfil-prestador.md`

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-105 | Escolher UF e cidade pela lista | Cidade oficial gravada |
| CT-106 | Cidade adulterada pelo DevTools | "Escolha uma cidade da lista."; nada gravado |
| CT-107 | Digitar parte do nome de um bairro | Sugestões da cidade; Enter adiciona com o nome do mapa |
| CT-108 | Bairro que não está no mapa | É adicionado; aviso de localização aproximada no dashboard |
| CT-109 | Referência "Centro", Campinas/SP, 5 km | Lista preenchida com bairros de Campinas; mensagem com a quantidade |
| CT-110 | Remover três sugeridos e salvar | Perfil gravado só com os restantes |
| CT-111 | Bairros adicionados antes + sugestão | Os anteriores continuam; sem repetidos |
| CT-112 | Cidade com mais de 30 bairros no raio | Lista com 30; mensagem com o total |
| CT-113 | "Remover todos" | Lista vazia; salvar mostra "Adicione pelo menos um bairro." |
| CT-114 | Trocar a cidade com bairros na lista | Bairros limpos; aviso |
| CT-115 | Perfil antigo com cidade fora da lista | Abre com erro na cidade; corrigir e salvar funciona |

---

## Fora do escopo

- Mapa na tela (pins, tiles). A busca é uma lista.
- PostGIS, índices espaciais e busca por polígono de bairro.
- Endereço ou localização exata do prestador.
- Raio a partir de um bairro escolhido. Raio é sempre a partir da localização do cliente; bairro é sempre correspondência exata.
- Corrigir ou filtrar o que o mapa chama de bairro. Condomínios, loteamentos e conjuntos habitacionais que o OpenStreetMap marca como bairro aparecem como vierem, e bairros que o mapa não tem só aparecem se algum prestador os cadastrar.
- Atualização periódica dos bairros de uma cidade já carregada. Recarga só manual (`pnpm db:places --reload`).
- Geocoding de texto digitado (Nominatim ou similar) e geocoding reverso em serviço externo.
- Guardar a última localização, cidade ou bairro do cliente, histórico de buscas e buscas salvas.
- Guardar a referência e o raio do prestador, ou usar o raio dele como área de atendimento. A área continua sendo a lista de bairros.
- Busca por texto livre, por nome de prestador, por faixa de preço ou por mais de uma categoria. Ordenar por preço.
- Paginação além dos 50 primeiros resultados.
- Tabela `review` e escrita da nota (Fase 5). Aqui só existem as colunas e o critério.
- Botões de contato nos cards (Fase 4).
- Limite de requisições por IP nas actions públicas. A fila protege o Overpass (uma consulta por vez, uma por cidade para sempre), não o próprio servidor.
- Limite de consultas ao mapa compartilhado entre réplicas (pendência para a T6.6).

## Notas para a Fase 6

- **T6.4 (anonimização de localização em 90 dias):** esta fase não grava localização de cliente em lugar nenhum. O que existe é `geo_place` e `geo_city` (bairros e cidades, dado público) e o vínculo de cada prestador aos bairros que ele mesmo publica no perfil. A política de retenção pode se apoiar nisso; resta cobrir os logs de acesso da infraestrutura.
- **T6.3 (criptografia de localização):** não há coluna de localização pessoal para criptografar.
- **Terceiros:** o único serviço externo é o Overpass (OpenStreetMap), que recebe só o código IBGE de um município, a partir do IP do servidor. Nenhum dado de cliente ou de prestador chega a ele. Entra no checklist da T6.5 como compartilhamento sem dado pessoal.
- **T6.6 (réplicas):** a fila do Overpass e o mapa de cargas em andamento são por processo. Com mais de uma réplica, duas podem carregar a mesma cidade ao mesmo tempo; o resultado é o mesmo (as gravações são idempotentes), só há uma consulta a mais.
