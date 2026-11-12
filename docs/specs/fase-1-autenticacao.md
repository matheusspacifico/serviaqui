# Spec — Fase 1: Fechar autenticação (pacote 2.0)

Cobre as tasks T1.1 a T1.5 do `docs/roadmap.md` (atividades AT05, AT06, AT07 e AT09).

O documento de cronograma não está no repositório; o texto das ATs foi inferido do roadmap. A AT06 não exige um algoritmo de hash específico (confirmado com o autor).

## Situação atual

- Cadastro, login, recuperação e redefinição de senha funcionam de ponta a ponta com Better Auth 1.7.2.
- Validação depende só dos atributos HTML (`required`, `type="email"`, `minLength`), então as mensagens saem no idioma do navegador.
- Os erros do servidor são exibidos com `error.message`, que vem em inglês ("Invalid email or password", "User already exists. Use another email."). O texto em pt-BR só aparece quando não há mensagem.
- `/dashboard` é a única rota protegida; a checagem está dentro da própria página. Usuário logado consegue abrir `/sign-in` e `/sign-up`.
- `SiteHeader` e `DashboardPage` chamam `auth.api.getSession` cada um, duas consultas por request.
- Não há framework de teste instalado.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Biblioteca de formulário/validação | Nenhuma. Validadores escritos à mão em `src/lib/auth-validation.ts` | São 4 formulários com 1 a 3 campos; `zod` só existe como dependência transitiva |
| Onde traduzir erros do servidor | No cliente, por `error.code`, em `src/lib/auth-errors.ts` | Os códigos são estáveis; as mensagens em inglês não |
| Proteção de rotas | `src/proxy.ts` faz só a checagem otimista (cookie existe?) nas rotas protegidas; a checagem real fica nas páginas, via `src/lib/session.ts` | A doc do Next 16 trata o Proxy como checagem otimista, não como autorização |
| Redirecionar usuário logado para fora das telas de auth | Na página (server component), com sessão validada no banco. **Não** no proxy | Cookie obsoleto (sessão apagada, banco recriado) faria o proxy mandar para `/dashboard` e a página devolver para `/sign-in`, em loop |
| Telas "só para deslogado" | `/sign-in`, `/sign-up`, `/forgot-password` | `/reset-password` continua acessível logado: quem clica no link do e-mail deve conseguir trocar a senha |
| Roteiro de teste (AT09) | Roteiro manual em Markdown | A atividade pede roteiro; testes automatizados ficam fora da fase |
| Algoritmo de hash (AT06) | Manter o scrypt padrão do Better Auth | A AT06 não exige algoritmo; scrypt é aceito pelo OWASP, usa `node:crypto` (sem dependência nova) e trocar para argon2id exigiria pacote nativo e código próprio de hash/verify sem ganho para o projeto |
| Sessões após redefinir a senha | Revogar todas (`revokeSessionsOnPasswordReset: true`) | Quem redefine a senha por suspeita de acesso indevido precisa derrubar as sessões abertas |

## Ordem e commits

Uma branch (`feat/auth-hardening`), um commit por task, nesta ordem: T1.1 → T1.2 → T1.4 → T1.3 → T1.5. A T1.2 depende do `FormField` da T1.1; a T1.5 descreve o comportamento final, então vem por último. Marcar `[x]` no roadmap no commit de cada task.

Antes de cada commit: `pnpm lint && pnpm typecheck`.

---

## T1.1 — Validação client-side com mensagens em pt-BR (AT05)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/auth-validation.ts` | novo |
| `src/components/form-field.tsx` | novo |
| `src/app/design/page.tsx` (ou `demos.tsx`) | adicionar `FormField` à vitrine (normal, com dica, com erro) |
| `src/app/sign-up/page.tsx`, `sign-in/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` | usar `FormField` + validadores |
| `src/lib/auth.ts` | declarar `minPasswordLength`/`maxPasswordLength` com as mesmas constantes |
| `CLAUDE.md` | incluir `form-field` na lista de componentes de domínio |

### `src/lib/auth-validation.ts`

Módulo puro (sem imports de React nem de servidor), para poder ser usado no cliente e em `auth.ts`.

```ts
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function validateName(value: string): string | null;
export function validateEmail(value: string): string | null;
export function validateNewPassword(value: string): string | null;
export function validateCurrentPassword(value: string): string | null;
```

Cada função devolve a mensagem de erro ou `null`.

| Função | Regra | Mensagem |
|---|---|---|
| `validateName` | vazio após `trim()` | Informe seu nome. |
| | menos de 2 caracteres após `trim()` | O nome precisa ter pelo menos 2 caracteres. |
| `validateEmail` | vazio após `trim()` | Informe seu e-mail. |
| | não casa com `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | Digite um e-mail válido, como nome@exemplo.com. |
| `validateNewPassword` | vazio | Informe uma senha. |
| | menos de `PASSWORD_MIN` | A senha precisa ter pelo menos 8 caracteres. |
| | mais de `PASSWORD_MAX` | A senha pode ter no máximo 128 caracteres. |
| `validateCurrentPassword` | vazio | Informe sua senha. |

Os limites 8 e 128 são os padrões do Better Auth (`dist/context/create-context.mjs`). Em `src/lib/auth.ts`, passar `minPasswordLength: PASSWORD_MIN` e `maxPasswordLength: PASSWORD_MAX` em `emailAndPassword` para que cliente e servidor nunca divirjam.

No login a senha só é checada como "não vazia": aplicar o mínimo ali revelaria a política e bloquearia contas criadas com outra regra.

### `src/components/form-field.tsx`

Agrupa `Label` + `Input` + dica + erro, que hoje se repetem nos quatro formulários.

```tsx
type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: string;
  error?: React.ReactNode;
};
```

- `id` do input = `name` (a não ser que `id` seja passado).
- Com `error`: `aria-invalid` no input, `aria-describedby` apontando para o parágrafo de erro, e `<p id={`${id}-error`} role="alert" className="text-sm text-destructive">`.
- Com `hint` e sem erro: `<p className="text-sm text-muted-foreground">`, também ligado por `aria-describedby`.
- `error` é `ReactNode` porque a T1.2 coloca links dentro da mensagem.

### Comportamento dos formulários

Igual nos quatro:

1. `<form noValidate>` e remover `required`/`minLength` dos inputs, para o navegador não mostrar os balões nativos.
2. Continuam não controlados (`FormData`). Estado novo: `fieldErrors: Partial<Record<campo, ReactNode>>`.
3. No submit: rodar os validadores de todos os campos. Se houver erro, gravar em `fieldErrors`, focar o primeiro campo inválido e **não** chamar o `authClient`.
4. `onChange` de um campo limpa só o erro daquele campo.
5. E-mail e nome são enviados com `trim()`. Senha vai como digitada.
6. O erro de formulário (`error` atual, abaixo dos campos) continua existindo para erros do servidor que não pertencem a um campo.

| Tela | Campos e validadores | `autoComplete` |
|---|---|---|
| `/sign-up` | nome → `validateName`; e-mail → `validateEmail`; senha → `validateNewPassword`, com `hint="Mínimo de 8 caracteres."` | `name`, `email`, `new-password` |
| `/sign-in` | e-mail → `validateEmail`; senha → `validateCurrentPassword` | `email`, `current-password` |
| `/forgot-password` | e-mail → `validateEmail` | `email` |
| `/reset-password` | senha → `validateNewPassword`, com a mesma dica | `new-password` |

### Aceite

- Submeter cada formulário vazio mostra uma mensagem em pt-BR embaixo de cada campo, sem request em `/api/auth/*` (conferir na aba Network).
- `ana@`, `ana.com` e `ana @x.com` são recusados; `ana@exemplo.com` com espaços nas pontas é aceito.
- Senha de 7 caracteres é recusada no cadastro e na redefinição; de 8, aceita.
- Nenhum balão de validação nativo do navegador aparece.
- `FormField` aparece em `/design`.

---

## T1.2 — Mensagem clara para e-mail já cadastrado (AT05)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/auth-errors.ts` | novo |
| as quatro telas de auth | trocar `error.message ?? "..."` por `authErrorMessage(error, "...")` |

### `src/lib/auth-errors.ts`

```ts
type AuthError = { code?: string; status?: number; message?: string };

export function isEmailTaken(error: AuthError): boolean;
export function authErrorMessage(error: AuthError, fallback: string): string;
```

`authErrorMessage` nunca devolve `error.message`: ou há tradução para o código, ou sai o `fallback` da tela.

| Condição | Mensagem |
|---|---|
| `code` `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` ou `USER_ALREADY_EXISTS` | Este e-mail já está cadastrado. |
| `code` `INVALID_EMAIL_OR_PASSWORD` | E-mail ou senha incorretos. |
| `code` `INVALID_EMAIL` | Digite um e-mail válido, como nome@exemplo.com. |
| `code` `PASSWORD_TOO_SHORT` | A senha precisa ter pelo menos 8 caracteres. |
| `code` `PASSWORD_TOO_LONG` | A senha pode ter no máximo 128 caracteres. |
| `code` `INVALID_TOKEN` | Link inválido ou expirado. Solicite um novo. |
| `status` 429 | Muitas tentativas. Aguarde um pouco e tente de novo. |
| qualquer outro | `fallback` |

Os códigos foram conferidos em `@better-auth/core/dist/error/codes.mjs` da versão instalada. `isEmailTaken` cobre os dois códigos de "já existe": o cadastro lança `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (HTTP 422) na checagem prévia.

### Cadastro com e-mail duplicado

Quando `isEmailTaken(error)`, o erro vai para o **campo de e-mail** (não para o erro geral), com foco no campo:

> Este e-mail já está cadastrado. [Entrar](/sign-in) ou [recuperar a senha](/forgot-password).

Os links usam as mesmas classes dos links já existentes nas telas (`font-medium text-primary underline-offset-4 hover:underline`). Nome e senha digitados são preservados.

Demais erros do servidor em qualquer tela: erro geral do formulário, via `authErrorMessage`. Fallbacks por tela continuam os atuais ("Não foi possível criar a conta.", etc.).

### Observações

- O Better Auth compara e-mails em minúsculas, então `ANA@exemplo.com` cai como duplicado de `ana@exemplo.com`.
- Essa mensagem permite descobrir se um e-mail tem conta (enumeração). É o que a task pede e o padrão do Better Auth nesta configuração. Se um dia `requireEmailVerification` for ligado ou `autoSignIn` desligado, o servidor passa a responder sucesso falso para e-mail duplicado e esta mensagem deixa de aparecer: o fluxo teria que ser revisto.
- Login continua com mensagem única para senha errada e e-mail inexistente.

### Aceite

- Cadastrar duas vezes o mesmo e-mail mostra a mensagem em pt-BR no campo de e-mail, com os dois links funcionando.
- Login com senha errada mostra "E-mail ou senha incorretos." (hoje aparece em inglês).
- Nenhuma tela exibe texto em inglês vindo do servidor.

---

## T1.4 — Proteger rotas logadas e tirar o usuário logado das telas de auth (AT07)

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/session.ts` | novo |
| `src/lib/redirect.ts` | novo |
| `src/proxy.ts` | novo |
| `src/app/dashboard/page.tsx` | usar `requireSession()` |
| `src/components/site-header.tsx` | usar `getSession()` |
| `src/app/sign-in/`, `sign-up/`, `forgot-password/` | `page.tsx` vira server component; o formulário atual vai para `*-form.tsx` na mesma pasta |
| `src/components/sign-out-button.tsx` | `router.refresh()` após sair |
| `src/lib/auth.ts` | `revokeSessionsOnPasswordReset: true` em `emailAndPassword` |
| `CLAUDE.md` | atualizar estrutura e convenção de sessão |

### `src/lib/session.ts` (server-only)

```ts
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireSession(redirectTo?: string); // devolve a sessão ou redireciona
export async function redirectIfAuthenticated(): Promise<void>;
```

- `cache` do React deduplica a consulta dentro do mesmo request (hoje `SiteHeader` + página consultam duas vezes).
- `requireSession(redirectTo)`: sem sessão, `redirect("/sign-in")` ou, com `redirectTo`, `redirect(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`)`. Com sessão, devolve a sessão já tipada como não nula.
- `redirectIfAuthenticated()`: com sessão, `redirect("/dashboard")`.
- Passa a ser o único jeito de ler sessão no servidor; atualizar a convenção no `CLAUDE.md`.

### `src/lib/redirect.ts`

```ts
export const DEFAULT_REDIRECT = "/dashboard";
export function safeRedirectPath(value: string | string[] | undefined): string;
```

Devolve `value` só se for uma string que começa com `/` e não com `//` nem `/\`; senão `DEFAULT_REDIRECT`. Evita open redirect via `?redirectTo=https://...`.

### `src/proxy.ts`

No Next 16 o antigo `middleware.ts` chama-se `proxy.ts` e fica dentro de `src/`.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/sign-in", request.url);
  url.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*"] };
```

- Só olha se o cookie existe; não consulta o banco. Serve para barrar cedo quem claramente não está logado.
- Não trata as telas de auth (ver "Decisões": evita loop com cookie obsoleto).
- Convenção para as próximas fases: toda rota logada nova entra no `matcher` **e** chama `requireSession()` na página ou na server action. O proxy sozinho não é proteção.

### Páginas

`/dashboard`: trocar o bloco `getSession` + `redirect` por `const session = await requireSession("/dashboard")`.

`/sign-in`, `/sign-up`, `/forgot-password`: cada pasta fica com

- `page.tsx` (server): `await redirectIfAuthenticated()` e renderiza `AuthShell` + o formulário;
- `sign-in-form.tsx` / `sign-up-form.tsx` / `forgot-password-form.tsx` (`"use client"`): o conteúdo atual do formulário.

Em `/sign-in` e `/sign-up`, a página lê `searchParams`, aplica `safeRedirectPath` e passa `redirectTo` como prop para o formulário, que usa `router.push(redirectTo)` no sucesso (em vez do `/dashboard` fixo). Os links cruzados "Criar conta" / "Entrar" repassam o `redirectTo` quando ele for diferente do padrão.

`/reset-password`: sem mudança de proteção.

### Sair

Em `SignOutButton`, depois de `router.push("/sign-in")` chamar `router.refresh()`, para descartar o que o router tiver em cache das páginas logadas.

### Revogar sessões ao redefinir a senha

Em `src/lib/auth.ts`, adicionar `revokeSessionsOnPasswordReset: true` em `emailAndPassword`. Ao concluir a redefinição, o Better Auth apaga todas as sessões do usuário, em qualquer navegador. O fluxo da tela não muda: `/reset-password` já manda para `/sign-in` no sucesso, e o usuário entra com a senha nova. Um navegador que ainda tenha o cookie antigo cai no caso de cookie obsoleto, já tratado acima.

### Aceite

- Com sessão aberta em dois navegadores, redefinir a senha em um deles derruba a sessão do outro: ao recarregar `/dashboard`, ele vai para `/sign-in`.
- Deslogado, abrir `/dashboard` leva a `/sign-in?redirectTo=%2Fdashboard`; após login, volta para `/dashboard`.
- Logado, abrir `/sign-in`, `/sign-up` ou `/forgot-password` (pela URL ou por link) leva a `/dashboard`.
- Logado, `/reset-password?token=...` abre normalmente.
- `/sign-in?redirectTo=https://example.com` e `?redirectTo=//example.com` terminam em `/dashboard` após o login.
- Com cookie obsoleto (apagar a linha em `session` pelo Drizzle Studio mantendo o cookie), `/dashboard` cai em `/sign-in` e a tela abre, sem loop de redirecionamento.
- Depois de sair, o botão voltar do navegador não mostra o dashboard.
- `pnpm build` passa (as páginas de auth deixam de ser estáticas; é esperado).

---

## T1.3 — Registrar que o hash do Better Auth atende ao requisito (AT06)

Task só de documentação: nenhum código muda.

### Arquivo

`docs/seguranca-senhas.md` (novo), com link a partir do `README.md`.

### Conteúdo

1. **Requisito**: transcrever o texto da AT06 do cronograma e registrar que ele não fixa um algoritmo, por isso foi mantido o padrão do Better Auth.
2. **Como a senha é armazenada** (conferido em `@better-auth/utils/dist/password.node.mjs`, usado pelo Better Auth 1.7.2):
   - algoritmo scrypt (`node:crypto`), sem configuração própria em `src/lib/auth.ts`;
   - parâmetros `N = 16384`, `r = 16`, `p = 1`, chave derivada de 64 bytes;
   - salt aleatório de 16 bytes por senha;
   - senha normalizada em NFKC antes do hash;
   - gravado em `account.password` no formato `salt:hash`, ambos em hexadecimal;
   - a senha em texto puro nunca é gravada nem logada.
3. **Por que atende**: scrypt é uma função de derivação com custo de memória, usada com salt único por senha, e está entre os algoritmos aceitos pelo OWASP Password Storage Cheat Sheet (citar o link). Sobre os parâmetros, ser exato: `N = 2^14, r = 16, p = 1` usa cerca de 32 MB por hash, enquanto a configuração de referência que lembro do OWASP para scrypt é `N = 2^17, r = 8, p = 1` (cerca de 128 MB). Conferir a tabela atual do cheat sheet e registrar a comparação como ela for, sem afirmar que os parâmetros superam a recomendação. Para o requisito ("senha com hash seguro"), o algoritmo e o salt bastam; a diferença de parâmetros entra como limitação conhecida.
4. **Evidência**: passo a passo reproduzível — criar uma conta, abrir `pnpm db:studio`, tabela `account`, mostrar que `password` tem o formato `salt:hash` e não contém a senha. Colar um exemplo com valor de conta de teste.
5. **Política de senha**: mínimo 8, máximo 128 (constantes de `src/lib/auth-validation.ts`).
6. **Alternativa considerada**: argon2id é a primeira recomendação do OWASP, mas exigiria um pacote nativo e funções próprias de hash/verify. Se um dia for necessário, `emailAndPassword.password.{ hash, verify }` em `auth.ts` é o ponto de extensão, e as senhas existentes precisariam continuar verificáveis em scrypt até o próximo login.
7. **Sessões**: redefinir a senha revoga todas as sessões do usuário (T1.4).

### Aceite

- O documento existe, cita a versão do Better Auth e os parâmetros, e a evidência do item 4 é reproduzível.

---

## T1.5 — Roteiro de teste de cadastro, login e recuperação (AT09)

### Arquivos

| Arquivo | Ação |
|---|---|
| `docs/testes/autenticacao.md` | novo |
| `README.md` | a seção "Testando a autenticação" passa a apontar para o roteiro |

### Formato

Cabeçalho com pré-requisitos (`pnpm db:up`, `pnpm db:push`, `pnpm dev`, navegador em janela anônima, terminal do servidor visível para pegar o link de reset) e uma conta de teste padrão. Depois, uma tabela por bloco com as colunas: ID, pré-condição, passos, resultado esperado, e uma coluna vazia "OK / Falhou" para preencher na execução. No fim, um registro de execução (data, quem executou, commit, navegador).

### Casos

**Cadastro**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-01 | Cadastro com dados válidos | Vai para `/dashboard`, logado, com o primeiro nome na saudação |
| CT-02 | Enviar formulário vazio | Mensagem em pt-BR em cada campo; nenhuma request |
| CT-03 | E-mail inválido (`ana@`, `ana.com`) | "Digite um e-mail válido, como nome@exemplo.com." |
| CT-04 | Senha com 7 caracteres | "A senha precisa ter pelo menos 8 caracteres." |
| CT-05 | E-mail já cadastrado | Mensagem no campo de e-mail com links para entrar e recuperar a senha |
| CT-06 | Mesmo e-mail em maiúsculas | Mesmo resultado do CT-05 |
| CT-07 | Conferir hash no banco | `account.password` no formato `salt:hash`, sem a senha em texto puro |

**Login**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-08 | E-mail e senha corretos | Vai para `/dashboard` |
| CT-09 | Senha errada | "E-mail ou senha incorretos." |
| CT-10 | E-mail sem conta | Mesma mensagem do CT-09 |
| CT-11 | Enviar formulário vazio | Mensagens por campo; nenhuma request |

**Rotas**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-12 | Deslogado abre `/dashboard` | Vai para `/sign-in?redirectTo=%2Fdashboard`; após login volta ao dashboard |
| CT-13 | Logado abre `/sign-in`, `/sign-up`, `/forgot-password` | Vai para `/dashboard` nos três |
| CT-14 | Sair e usar o botão voltar | Vai para `/sign-in`; o dashboard não reaparece |
| CT-15 | Cookie obsoleto (apagar a sessão no Drizzle Studio) e abrir `/dashboard` | Tela de login, sem loop |
| CT-16 | Login por `/sign-in?redirectTo=https://example.com` | Termina em `/dashboard` |

**Recuperação de senha**

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-17 | Solicitar com e-mail cadastrado | Mensagem neutra na tela; link aparece no terminal do servidor |
| CT-18 | Solicitar com e-mail sem conta | Mesma mensagem; nenhum link no terminal |
| CT-19 | Abrir o link e definir senha válida | Vai para `/sign-in`; a senha nova entra, a antiga não |
| CT-20 | Abrir o mesmo link de novo | "Link inválido ou expirado" com atalho para pedir outro |
| CT-21 | Abrir `/reset-password` sem token | Mesmo resultado do CT-20 |
| CT-22 | Nova senha com 7 caracteres | Erro no campo; nenhuma request |
| CT-23 | Link expirado (validade de 1 h; simular alterando `expires_at` na tabela `verification`) | Mesmo resultado do CT-20 |
| CT-24 | Logado em dois navegadores, redefinir a senha em um e recarregar `/dashboard` no outro | O outro navegador vai para `/sign-in`; só a senha nova entra |

### Aceite

- O roteiro foi executado uma vez por inteiro no commit final da fase, com o registro de execução preenchido e todos os casos em "OK".

---

## Fora do escopo

- Envio real de e-mail (o link de reset continua só no console) e verificação de e-mail.
- Login social, 2FA, "lembrar de mim".
- Campo de confirmação de senha e medidor de força.
- Testes automatizados (Playwright/Vitest).
- Diferenciação cliente/prestador: entra na Fase 2.
- Trocar o algoritmo de hash (ver T1.3).
