# Roteiro de teste — cadastro, login e recuperação de senha (AT09)

Roteiro manual. Executar por inteiro, na ordem, e preencher a coluna "OK / Falhou" e o registro de execução no fim.

## Pré-requisitos

1. `pnpm db:up` e `pnpm db:push`.
2. `pnpm dev`, com o terminal do servidor visível: o link de redefinição de senha aparece ali (`[auth] Reset de senha para ...`).
3. Navegador em janela anônima, com a aba Network do DevTools aberta e filtrada por `api/auth`.
4. `pnpm db:studio` em outro terminal, para os casos que olham ou alteram o banco (CT-07, CT-15, CT-23).

Conta de teste padrão (criada no CT-01):

| Campo | Valor |
|---|---|
| Nome | Ana Teste |
| E-mail | `ana.teste@exemplo.com` |
| Senha | `senha-teste-1` |
| Senha nova (CT-19) | `senha-teste-2` |

Se o e-mail já existir no banco de uma execução anterior, apagar o usuário no Drizzle Studio (tabela `user`) ou usar outro e-mail em todo o roteiro.

"Nenhuma request" significa: nenhuma linha nova em `api/auth` na aba Network.

## Cadastro

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-01 | Deslogado; e-mail da conta de teste ainda não cadastrado | Abrir `/sign-up`, preencher nome, e-mail e senha da conta de teste, clicar em **Criar conta** | Vai para `/dashboard`, logado, com a saudação "Olá, Ana" | |
| CT-02 | Deslogado | Abrir `/sign-up` e clicar em **Criar conta** com tudo vazio | "Informe seu nome.", "Informe seu e-mail." e "Informe uma senha." embaixo de cada campo; foco no nome; nenhum balão do navegador; nenhuma request | |
| CT-03 | Deslogado | Em `/sign-up`, preencher nome e senha válidos e tentar os e-mails `ana@` e depois `ana.com` | "Digite um e-mail válido, como nome@exemplo.com." no campo de e-mail; nenhuma request | |
| CT-04 | Deslogado | Em `/sign-up`, nome e e-mail válidos e senha `1234567` | "A senha precisa ter pelo menos 8 caracteres." no campo de senha; nenhuma request | |
| CT-05 | CT-01 feito; deslogado (clicar em **Sair**) | Em `/sign-up`, cadastrar de novo com o e-mail da conta de teste | No campo de e-mail: "Este e-mail já está cadastrado. Entrar ou recuperar a senha.", com os links levando a `/sign-in` e `/forgot-password`; nome e senha digitados continuam preenchidos | |
| CT-06 | CT-01 feito; deslogado | Repetir o CT-05 com o e-mail em maiúsculas (`ANA.TESTE@EXEMPLO.COM`) | Mesmo resultado do CT-05 | |
| CT-07 | CT-01 feito | No Drizzle Studio, abrir a tabela `account` e localizar a linha da conta de teste | `password` no formato `salt:hash` (32 caracteres hexadecimais, `:`, 128 caracteres hexadecimais), sem a senha em texto puro | |

## Login

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-08 | Conta de teste existe; deslogado | Em `/sign-in`, entrar com e-mail e senha corretos | Vai para `/dashboard` | |
| CT-09 | Conta de teste existe; deslogado | Em `/sign-in`, e-mail correto e senha `errada-123` | "E-mail ou senha incorretos.", em português | |
| CT-10 | Deslogado | Em `/sign-in`, e-mail `ninguem@exemplo.com` e qualquer senha | Mesma mensagem do CT-09 | |
| CT-11 | Deslogado | Em `/sign-in`, clicar em **Entrar** com tudo vazio | "Informe seu e-mail." e "Informe sua senha." nos campos; nenhuma request | |

## Rotas

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-12 | Deslogado | Abrir `/dashboard` pela barra de endereço; depois fazer login na tela que abrir | Vai para `/sign-in?redirectTo=%2Fdashboard`; após o login, volta ao dashboard | |
| CT-13 | Logado | Abrir pela barra de endereço `/sign-in`, `/sign-up` e `/forgot-password` | Vai para `/dashboard` nos três | |
| CT-14 | Logado, em `/dashboard` | Clicar em **Sair** e depois no botão voltar do navegador | Sair leva a `/sign-in`; ao voltar, o dashboard não reaparece (fica na tela de login) | |
| CT-15 | Logado | No Drizzle Studio, apagar a linha do usuário na tabela `session` (o cookie continua no navegador); abrir `/dashboard` | Abre a tela de login, sem loop de redirecionamento | |
| CT-16 | Deslogado | Abrir `/sign-in?redirectTo=https://example.com` e fazer login | Termina em `/dashboard`, não em `example.com` | |

## Recuperação de senha

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-17 | Conta de teste existe; deslogado | Em `/forgot-password`, informar o e-mail da conta de teste e enviar | Mensagem neutra na tela ("Se o e-mail existir, um link de redefinição foi gerado..."); o link aparece no terminal do servidor | |
| CT-18 | Deslogado | Em `/forgot-password`, informar `ninguem@exemplo.com` e enviar | Mesma mensagem do CT-17; nenhum link no terminal | |
| CT-19 | Link do CT-17 em mãos | Abrir o link, definir a senha `senha-teste-2` e enviar; depois tentar login com a senha antiga e com a nova | Vai para `/sign-in`; a senha antiga dá "E-mail ou senha incorretos."; a nova entra | |
| CT-20 | CT-19 feito | Abrir de novo o mesmo link do CT-17 | "Link inválido ou expirado." com o atalho **Solicitar um novo link** | |
| CT-21 | — | Abrir `/reset-password` sem token | Mesmo resultado do CT-20 | |
| CT-22 | Deslogado; pedir um link novo em `/forgot-password` e abri-lo | Definir a senha `1234567` | "A senha precisa ter pelo menos 8 caracteres." no campo; nenhuma request | |
| CT-23 | Deslogado; pedir um link novo em `/forgot-password` (validade de 1 h) | No Drizzle Studio, tabela `verification`, alterar `expires_at` da linha `reset-password:...` para uma data passada; abrir o link | Mesmo resultado do CT-20 | |
| CT-24 | Logado com a conta de teste em dois navegadores (A e B); link de redefinição novo em mãos | No A, abrir o link e definir uma senha nova; no B, recarregar `/dashboard` | O B vai para `/sign-in`; só a senha nova entra | |

## Registro de execução

| Data | Quem executou | Commit | Navegador | Resultado |
|---|---|---|---|---|
| 12/11/2026 | Claude Code, com script Playwright (execução automatizada, não manual) | `b6d8a5c` | Chromium 1247 (headless), `pnpm dev` | CT-01 a CT-24: OK |
| | | | | |

Observações da execução de 12/11/2026:

- Os passos de Drizzle Studio (CT-07, CT-15, CT-23) foram feitos por SQL direto no Postgres do Docker.
- "Nenhum balão do navegador" (CT-02) não foi conferido visualmente; foi conferido que o formulário usa `noValidate` e que as mensagens em pt-BR aparecem.
- Falta uma passada manual em navegador real para cumprir o roteiro como escrito.
