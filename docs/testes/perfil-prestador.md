# Roteiro de teste — cadastro do prestador (AT03)

Roteiro manual. Executar por inteiro, na ordem, e preencher a coluna "OK / Falhou" e o registro de execução no fim. A numeração continua a do [`autenticacao.md`](autenticacao.md).

As regras de telefone, valor e bairro também têm testes unitários: `pnpm test` (`src/lib/provider-validation.test.ts`). Rodar antes do roteiro.

## Pré-requisitos

1. `pnpm db:up`, `pnpm db:push` e `pnpm db:seed` (sem o seed o formulário mostra um aviso no lugar dos campos).
2. `pnpm dev`.
3. Navegador em janela anônima, com a aba Network do DevTools aberta.
4. `pnpm db:studio` em outro terminal, para os casos que olham ou alteram o banco (CT-34, CT-37 a CT-40, CT-46).

Contas de teste (criadas durante o roteiro):

| Conta | Nome | E-mail | Senha |
|---|---|---|---|
| Prestador A (CT-26) | Paula Prestadora | `prestador.a.teste@exemplo.com` | `senha-teste-1` |
| Prestador B (CT-39) | Bruno Prestador | `prestador.b.teste@exemplo.com` | `senha-teste-1` |

Se os e-mails já existirem de uma execução anterior, apagar os usuários no Drizzle Studio (tabela `user`; o perfil vai junto) ou usar outros e-mails em todo o roteiro.

"Nenhuma request" significa: nenhuma linha `POST` nova para `/dashboard/prestador` na aba Network. "Campos obrigatórios" são nome de exibição, telefone, pelo menos um serviço, cidade, UF e pelo menos um bairro.

## Cadastro

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-25 | Conta A existe (fazer depois do CT-26); deslogado | Abrir `/dashboard/prestador` pela barra de endereço; fazer login com a conta A na tela que abrir | Vai para `/sign-in?redirectTo=%2Fdashboard%2Fprestador`; após o login, volta ao formulário | |
| CT-26 | Deslogado; e-mail da conta A ainda não cadastrado | Na home, clicar em **Quero oferecer serviços** e criar a conta A | Termina em `/dashboard/prestador`, com o título "Criar perfil de prestador" | |
| CT-27 | Logado com A, sem perfil | Abrir `/dashboard/prestador` | "Nome de exibição" preenchido com "Paula Prestadora"; "Este número tem WhatsApp" marcado | |
| CT-28 | CT-27 | Apagar o nome e clicar em **Criar perfil** | Mensagem em pt-BR embaixo de nome, telefone, serviços, cidade, UF e bairros; nada em valor e descrição; foco no nome; nenhuma request. Ao digitar no nome, só a mensagem dele some | |
| CT-29 | Formulário aberto | Telefone `1234`, clicar em **Criar perfil** | "Digite um telefone com DDD, como (11) 91234-5678." | |
| CT-30 | Formulário aberto | Valor por hora `80.50`, clicar em **Criar perfil** | "Use vírgula para os centavos, como 80,50." | |
| CT-31 | Formulário aberto | Valor por hora `0,50` e depois `1.200,00`, enviando a cada vez | "O valor precisa ficar entre R$ 1,00 e R$ 1.000,00." nos dois; depois, apagar o valor | |
| CT-32 | Formulário aberto | Marcar cinco serviços e tentar marcar o sexto | Não é possível: as opções restantes ficam desabilitadas. Depois, deixar só **Eletricista** | |
| CT-33 | Formulário aberto | Em Bairros, digitar `Centro` + Enter, `centro` + Enter e ` CENTRO ` + Enter; depois adicionar bairros até completar 10 | Uma etiqueta só para "Centro"; com 10 etiquetas o campo fica desabilitado. Depois, remover as extras pelo **x**, deixando só "Centro" | |
| CT-34 | Só os obrigatórios preenchidos: nome, telefone `11912345678`, Eletricista, cidade `São Paulo`, UF `SP`, bairro `Centro` | Clicar em **Criar perfil**; conferir `provider_profile` no Studio | O telefone aparece como `(11) 91234-5678` enquanto é digitado. Toast "Perfil criado."; `/dashboard` mostra o card com nome, serviço e "São Paulo/SP". No banco: 1 linha, `phone` = `11912345678`, `hourly_rate_cents` e `description` nulos | |
| CT-35 | Conta nova sem perfil (pode ser a B, antes do CT-39) | Cronometrar o preenchimento dos obrigatórios, do primeiro clique no formulário até o toast | Menos de 30 s (registrar o tempo nas observações) | |

## Edição

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-36 | CT-34 feito | No dashboard, clicar em **Editar perfil** | Título "Editar perfil"; todos os campos com os valores salvos | |
| CT-37 | CT-36; anotar o `id` do perfil no Studio | Trocar os serviços para Pintor e Babá, os bairros para Vila Mariana e São José, valor `80`, descrição com `<b>teste</b>` e duas linhas, telefone `+55 11 91234-5678`; salvar. Repetir a edição com os valores `80,5` e `1.000,00` | Toast "Perfil atualizado."; no banco, mesmo `id`, `phone` = `11912345678`, só as duas linhas novas em `provider_service` e em `provider_area`; `hourly_rate_cents` = 8000, depois 8050 e 100000 | |
| CT-38 | CT-37 (fazer depois do CT-41 ao CT-43) | Apagar valor e descrição, salvar; abrir a página pública | `hourly_rate_cents` e `description` voltam a `null`; a página pública mostra "Valor a combinar" e não tem a seção "Sobre" | |
| CT-39 | Perfil de A criado | Em outra janela anônima, criar a conta B e o perfil dela (telefone fixo `1131234567`, "Tem WhatsApp" desmarcado, Diarista, Campinas/SP, bairro `Cambuí` digitado **sem** Enter antes de clicar em **Criar perfil**) | Perfil de B criado com o bairro digitado; perfil de A inalterado; `user_id` distintos; `phone_is_whatsapp` de B é `false` | |
| CT-40 | Logado com A, em `/dashboard/prestador` | No DevTools, trocar o `value` do checkbox de um serviço desmarcado por `hacker`, marcá-lo e salvar | "Escolha serviços da lista."; nada gravado (`updated_at` e linhas filhas iguais) | |

## Página pública

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-41 | CT-37 feito; janela anônima deslogada | Abrir `/prestador/{id de A}` | Nome, "São Paulo/SP", "Novo no ServiAqui", serviços na ordem do seed (Pintor antes de Babá), valor, descrição, bairros em ordem alfabética e o card "Contato por WhatsApp e telefone em breve."; sem botão "Editar perfil"; título da aba "Paula Prestadora — Pintor em São Paulo/SP \| ServiAqui" | |
| CT-42 | CT-41 | "Exibir código-fonte" e respostas da aba Network: procurar `11912345678`, `91234` e `5678` | O telefone não aparece | |
| CT-43 | CT-41 | Conferir a seção "Sobre" | `<b>teste</b>` aparece literal (sem negrito), com a quebra de linha | |
| CT-44 | — | Abrir `/prestador/nao-existe` | "Prestador não encontrado" e botão "Voltar para o início"; status 404 na aba Network | |
| CT-45 | Logado com A | No dashboard, clicar em **Ver perfil público**; depois abrir a mesma URL logado com B | Abre `/prestador/{id de A}`; com A aparece "Editar perfil"; com B, não | |
| CT-46 | Perfil de B criado; anotar o `id` | No Studio, apagar o `user` de B e abrir `/prestador/{id de B}` | "Prestador não encontrado", status 404; nenhuma linha de B em `provider_service` e `provider_area` | |

## Registro de execução

| Data | Quem executou | Commit | Navegador | Resultado |
|---|---|---|---|---|
| 12/11/2026 | Claude Code, com script Playwright (execução automatizada, não manual) | `51370d7` | Chromium 155.0.8059.12 (headless), `pnpm dev` | CT-25 a CT-46: OK |
| | | | | |

Observações da execução de 12/11/2026:

- `pnpm test`: 30 testes, todos passando.
- Os passos de Drizzle Studio (CT-34, CT-37 a CT-40, CT-46) foram feitos por SQL direto no Postgres do Docker. A adulteração do CT-40 foi feita por script na página, não pelo painel do DevTools.
- CT-35: 3,6 s, com digitação simulada a 120 ms por tecla. **Não é uma medição com uma pessoa**; a linha de base da T6.1 precisa de uma tomada de tempo manual.
- CT-42: foram vasculhados o HTML final e as respostas que o navegador recebeu ao abrir a página, ignorando espaços e pontuação.
- "Nenhuma request" (CT-28) foi conferido contando os `POST` para `/dashboard/prestador`.
- Falta uma passada manual em navegador real para cumprir o roteiro como escrito.
