# Roteiro de teste — busca geolocalizada (AT14)

Roteiro manual. Executar por inteiro, na ordem, e preencher a coluna "OK / Falhou" e o registro de execução no fim. A numeração continua a do [`perfil-prestador.md`](perfil-prestador.md).

As regras de distância, validação da busca, municípios e ordenação também têm testes unitários: `pnpm test` (`geo`, `search-validation`, `municipalities`, `ranking`). Rodar antes do roteiro.

## Pré-requisitos

1. `pnpm db:up`, `pnpm db:push`, `pnpm db:seed` e `pnpm db:seed:demo`.
2. `GEO_USER_AGENT` preenchido no `.env` (sem ele os bairros de cidades fora do seed não são carregados do mapa).
3. `pnpm dev`, com o terminal visível para os casos que olham o log.
4. Navegador em janela anônima, com a aba Network do DevTools aberta. A localização é simulada em DevTools → Sensors → Location, nas coordenadas da tabela de bairros abaixo.
5. `pnpm db:studio` em outro terminal, para os casos que olham ou alteram o banco (CT-77, CT-83, CT-88, CT-100 a CT-104).

"Permitir" e "negar" são as respostas ao aviso de localização do navegador. Para voltar ao estado "ainda não decidido", limpar a permissão do site no cadeado da barra de endereço.

## Dados de demonstração

Prestadores gravados por `pnpm db:seed:demo` (todos em SP). "Nota" é média e quantidade de avaliações; "ajustada" é a nota usada na ordenação (`adjustedRating`).

| Prestador | Serviços | Cidade | Bairros | Valor | Nota | Ajustada |
|---|---|---|---|---|---|---|
| Carlos Elétrica | Eletricista | São Paulo | Sé, Bela Vista | R$ 90,00/h | 4,8 (50) | 4,73 |
| Marina Souza | Eletricista, Técnico de ar-condicionado | São Paulo | Pinheiros | R$ 120,00/h | 5,0 (1) | 4,17 |
| Eletro Mooca | Eletricista | São Paulo | Mooca | R$ 80,00/h | nova | 4,00 |
| João Pereira | Eletricista, Encanador | São Paulo | Vila Mariana | Valor a combinar | 3,0 (20) | 3,20 |
| Tatuapé Instalações | Eletricista | São Paulo | Tatuapé, Itaquera | R$ 100,00/h | 4,5 (8) | 4,31 |
| Luz & Cia | Eletricista | São Paulo | Sé | R$ 95,00/h | nova | 4,00 |
| Val Reparos | Encanador, Pedreiro | São Paulo | Santana, Lapa | R$ 70,00/h | nova | 4,00 |
| Dona Cida Limpeza | Diarista | São Paulo | Bela Vista | R$ 40,00/h | 4,9 (30) | 4,77 |
| Rosa Almeida | Diarista | São Paulo | Bela Vista | R$ 35,00/h | nova | 4,00 |
| Chaveiro Itaquera 24h | Chaveiro | São Paulo | Itaquera | R$ 60,00/h | nova | 4,00 |
| Pinturas Santo Amaro | Pintor | São Paulo | Santo Amaro | R$ 55,00/h | nova | 4,00 |
| Lapa Jardins | Jardineiro | São Paulo | Lapa | R$ 50,00/h | nova | 4,00 |
| Bruno Montador | Montador de móveis | São Paulo | Jardim Inexistente | R$ 45,00/h | nova | 4,00 |
| Campinas Elétrica | Eletricista | Campinas | Centro, Cambuí | R$ 85,00/h | 4,6 (12) | 4,42 |
| Lúcia Manicure | Manicure e pedicure | Campinas | Cambuí | R$ 30,00/h | nova | 4,00 |

Categoria sem nenhum prestador: "Aulas particulares". "Jardim Inexistente" não está no mapa: fica com a coordenada da sede de São Paulo (−23,5329 / −46,6395).

Bairros do seed (coordenadas para o Sensors):

| Cidade | Bairro | Latitude | Longitude | Tem prestador |
|---|---|---|---|---|
| São Paulo | Sé | −23,5505 | −46,6333 | sim |
| São Paulo | Bela Vista | −23,5614 | −46,6559 | sim |
| São Paulo | Pinheiros | −23,5670 | −46,7020 | sim |
| São Paulo | Vila Mariana | −23,5892 | −46,6344 | sim |
| São Paulo | Mooca | −23,5606 | −46,5997 | sim |
| São Paulo | Tatuapé | −23,5403 | −46,5766 | sim |
| São Paulo | Santana | −23,5016 | −46,6258 | sim |
| São Paulo | Lapa | −23,5275 | −46,7044 | sim |
| São Paulo | Santo Amaro | −23,6522 | −46,7108 | sim |
| São Paulo | Itaquera | −23,5360 | −46,4555 | sim |
| São Paulo | Liberdade | −23,5596 | −46,6328 | não |
| São Paulo | Consolação | −23,5530 | −46,6590 | não |
| São Paulo | Butantã | −23,5717 | −46,7081 | não |
| Campinas | Centro | −22,9056 | −47,0608 | sim |
| Campinas | Cambuí | −22,8920 | −47,0490 | sim |
| Campinas | Taquaral | −22,8740 | −47,0500 | não |

Matriz de distâncias em km (`haversineKm`), da localização do cliente (linha) até o centro do bairro (coluna). A origem é a coordenada do bairro **arredondada para 3 casas**, como o browser envia; por isso a distância até o próprio bairro não é zero.

| De \ até | Sé | Bela Vista | Pinheiros | Vila Mariana | Mooca | Tatuapé | Santana | Lapa | Santo Amaro | Itaquera | Sede (Jd. Inexistente) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sé (−23,550 / −46,633) | 0,06 | 2,66 | 7,28 | 4,36 | 3,59 | 5,85 | 5,43 | 7,70 | 13,86 | 18,16 | 2,01 |
| Pinheiros (−23,567 / −46,702) | 7,24 | 4,74 | 0,00 | 7,32 | 10,45 | 13,12 | 10,64 | 4,40 | 9,52 | 25,36 | 7,41 |
| Lapa (−23,527 / −46,704) | 7,67 | 6,22 | 4,45 | 9,91 | 11,27 | 13,07 | 8,46 | 0,07 | 13,94 | 25,35 | 6,61 |

## Busca por distância (raio)

Em todos: localização simulada e permitida; modo "Distância".

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-47 | Localização na Sé | Serviço Eletricista, 2 km | Só Carlos Elétrica e Luz & Cia, os dois com "Sé · ≈ 100 m". Resumo "2 prestadores de eletricista a até 2 km de você" | |
| CT-48 | CT-47 | Trocar para 5 km | Os do CT-47 mais Eletro Mooca ("Mooca · ≈ 3,6 km") e João Pereira ("Vila Mariana · ≈ 4,4 km") | |
| CT-49 | CT-47 | Trocar para 20 km | Os do CT-48 mais Tatuapé Instalações ("Tatuapé · ≈ 5,8 km") e Marina Souza ("Pinheiros · ≈ 7,3 km"). Campinas Elétrica não aparece | |
| CT-50 | Localização na Sé | Eletricista, 10 km; conferir Tatuapé Instalações (Tatuapé a 5,85 km, dentro; Itaquera a 18,16 km, fora). Repetir em 2 km para Carlos Elétrica (Sé dentro; Bela Vista a 2,66 km, fora) | Cada um aparece uma vez só, com o bairro de dentro: "Tatuapé · ≈ 5,8 km" e "Sé · ≈ 100 m" | |
| CT-51 | Localização na Sé | Eletricista, 5 km, "Mais próximos" | Carlos Elétrica no topo, com "≈ 100 m" | |
| CT-52 | Localização na Sé | Montador de móveis, 2 km; depois 5 km (Bruno Montador está a 2,01 km) | Em 2 km, vazio; em 5 km, Bruno Montador aparece | |
| CT-53 | Localização na Lapa | Chaveiro, 20 km (Itaquera está a 25,35 km) | Vazio, com "Tente outro serviço ou escolha um bairro nos filtros."; sem botão de ampliar | |
| CT-54 | Localização na Sé | Aulas particulares, 5 km | "Infelizmente ainda não temos prestadores de aulas particulares a até 5 km de você." e botão "Buscar em até 10 km"; clicar busca em 10 km | |
| CT-55 | Localização na Sé | Montador de móveis, 5 km | Bruno Montador com "Jardim Inexistente · ≈ 2,0 km" (distância até o centro da cidade, localização aproximada) | |

A spec previa o CT-55 em 2 km. Com a sede de São Paulo do arquivo de municípios, o centro fica a 2,01 km da Sé, logo fora de 2 km; o caso usa 5 km e os 2 km viraram o caso de borda (CT-52).

## Localização e cidade padrão

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-56 | Permissão ainda não decidida | Abrir `/buscar` e não clicar em nada | O navegador não pede permissão; aparece o texto "Escolha um serviço e use sua localização, ou escolha um bairro nos filtros." | |
| CT-57 | CT-56; localização na Sé | Clicar no pin e permitir; abrir os filtros | Cidade "São Paulo/SP"; modo "Distância"; resumo dos filtros "5 km"; URL sem coordenadas | |
| CT-58 | CT-57 | Recarregar a página | A localização é usada sozinha, sem aviso do navegador; a cidade já vem escolhida | |
| CT-59 | Localização no Cambuí | Clicar no pin; abrir os filtros | Cidade "Campinas/SP" | |
| CT-60 | Localização em uma cidade pequena sem prestadores (ex.: Itu, −23,264 / −47,299) | Clicar no pin, escolher Eletricista | A cidade certa aparece nos filtros; busca por distância vazia | |
| CT-61 | Permissão ainda não decidida | Clicar no pin e negar | "Você não permitiu o acesso à localização. Escolha a cidade e o bairro para buscar."; painel aberto no modo "Bairro"; foco no botão de cidade | |
| CT-62 | Permissão ainda não decidida | Abrir os filtros e escolher "Distância" | O navegador pede a permissão nesse momento | |

## Cidade e bairro

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-63 | Filtros abertos | Abrir a tela de cidade, UF "SP", digitar `camp` | Campinas na lista (com outras que têm "camp" no nome) | |
| CT-64 | CT-63 | Digitar `sao paulo` sem acento | São Paulo na lista | |
| CT-65 | Tela de cidade | Escolher uma UF e uma cidade sem nenhum prestador | Cidade selecionada normalmente; volta para a tela principal no modo "Bairro" | |
| CT-66 | Cidade São Paulo/SP, serviço Eletricista | Abrir a tela de bairro | Primeiro os bairros com eletricista, com a quantidade: Bela Vista 1, Itaquera 1, Mooca 1, Pinheiros 1, Sé 2, Tatuapé 1, Vila Mariana 1. Os demais apagados, com "sem prestadores" | |
| CT-67 | CT-66 | Digitar `vila` | Só "Vila Mariana" | |
| CT-68 | CT-66 | Digitar `SE` e depois `sé` | "Sé" aparece nos dois casos | |
| CT-69 | CT-66 | Digitar `zzz` | "Nenhum bairro com esse nome." | |
| CT-70 | Sem localização (permissão não decidida) | Escolher "Sé", Eletricista | Carlos Elétrica e depois Luz & Cia (ordem por avaliação); cards com "Sé", sem distância; o navegador não pede permissão; resumo "2 prestadores de eletricista em Sé, São Paulo/SP" | |
| CT-71 | Localização em Pinheiros, permitida | Nos filtros, escolher a cidade São Paulo/SP (em Pinheiros a cidade detectada é Taboão da Serra, cuja sede fica mais perto: é o caso de divisa previsto na spec), o bairro "Sé" e o serviço Eletricista | Mesmos prestadores do CT-70; cards com "Sé · ≈ 7,2 km"; nos filtros, sem "Ordenar por" e sem opções de raio | |
| CT-72 | Cidade São Paulo/SP, Eletricista | Escolher "Liberdade" | Bairro clicável; "Infelizmente ainda não temos prestadores nessa região." e "Tente outro bairro ou busque por distância." | |
| CT-73 | Cidade São Paulo/SP | Escolher "Sé" com o serviço Diarista | Mesma mensagem do CT-72 | |
| CT-74 | CT-66 | Trocar o serviço para Diarista e reabrir a tela de bairro | Só Bela Vista com quantidade (2); os demais apagados | |
| CT-75 | Cidade São Paulo/SP | Escolher "Jardim Inexistente" e o serviço Montador de móveis | Bruno Montador aparece | |
| CT-76 | Localização na Sé, permitida | Nos filtros, trocar a cidade para Campinas | Modo vira "Bairro"; texto "A busca por distância usa sua localização atual. Para outra cidade, escolha o bairro."; a tela de bairro lista Cambuí, Centro e Taquaral | |
| CT-77 | Cidade real fora do seed, ainda sem linha em `geo_city` | Escolher a cidade e abrir a tela de bairro | Carregamento; passando de 2 s, "Buscando os bairros de {cidade} no mapa. Só demora na primeira vez."; depois, os bairros reais. Linha nova em `geo_city` | |
| CT-78 | CT-77 | Reabrir a tela de bairro da mesma cidade | Lista imediata; nenhuma consulta nova ao Overpass (sem erro `[overpass]` no log e sem espera) | |
| CT-79 | `OVERPASS_URL` inválida no `.env` (reiniciar o `pnpm dev`); cidade ainda não carregada | Abrir a tela de bairro dessa cidade; depois corrigir a URL, reiniciar e clicar em "Tentar de novo" | "Não foi possível carregar todos os bairros agora." e botão "Tentar de novo"; depois da correção, os bairros aparecem | |
| CT-80 | Busca por bairro feita | Copiar a URL (tem `servico` e `local`) e abrir em outra aba | A busca se repete sozinha, com cidade e bairro preenchidos | |

## Ordenação

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-81 | Localização na Sé; Eletricista, 20 km | "Mais próximos" | Carlos Elétrica, Luz & Cia, Eletro Mooca, João Pereira, Tatuapé Instalações, Marina Souza. Carlos e Luz & Cia empatam em 0,1 km e a nota decide (4,73 contra 4,00) | |
| CT-82 | CT-81 | "Melhor avaliados" | Carlos Elétrica (4,73), Tatuapé Instalações (4,31), Marina Souza (4,17), Luz & Cia (4,00), Eletro Mooca (4,00), João Pereira (3,20). Carlos, com 50 notas, vem antes de Marina, com uma nota 5; os novos ficam no meio | |
| CT-83 | CT-82 | No Studio, pôr `rating_average = 5` e `rating_count = 40` em Eletro Mooca; buscar de novo. Depois, rodar `pnpm db:seed:demo` para restaurar | Eletro Mooca (ajustada 4,89) passa para o topo em "Melhor avaliados" | |

## Tela, privacidade e estados

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-84 | Deslogado | Abrir `/buscar` e fazer uma busca | A página abre e busca | |
| CT-85 | Resultado com Carlos Elétrica e João Pereira | Conferir os dois cards | Nome, valor em destaque à direita ("R$ 90,00/h") ou "Valor a combinar" discreto, bairro/distância abaixo do nome | |
| CT-86 | — | Abrir `/buscar?raio=7&ordem=x&servico=nao-existe&local=nao-existe` | A página abre com os padrões, sem erro | |
| CT-87 | Busca feita | Procurar `1199999` nas respostas das actions (aba Network) | O telefone não aparece | |
| CT-88 | Busca por distância feita | Procurar as coordenadas na URL, nas tabelas do banco e no log do `pnpm dev` | Não aparecem | |
| CT-89 | Sessão de busca completa | Conferir os domínios na aba Network | Nenhuma request do browser a serviço de mapa; só ao nosso servidor. As coordenadas aparecem só no corpo das actions, com 3 casas | |
| CT-90 | Rede em "Slow 4G" | Fazer uma busca | Quatro esqueletos; a altura de cada item não muda quando os cards entram | |
| CT-91 | Banco parado (`pnpm db:down`) | Fazer uma busca; subir o banco e clicar em "Tentar de novo" | "Não foi possível buscar agora. Tente de novo." com o botão; funciona depois de subir o banco | |
| CT-92 | Resultado na tela | Clicar em um card | Abre a página pública do prestador | |
| CT-93 | Janela com 360 px de largura | Fazer uma busca e abrir as três telas dos filtros | Barra em uma linha, sem rolagem horizontal; lista em uma coluna; nome e valor na mesma linha; painel utilizável | |

## Página inicial e navegação

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-94 | Logado | Clicar no logo "ServiAqui" e abrir `/` direto | Vai para `/buscar` nos dois casos; a home de deslogado não aparece | |
| CT-95 | Deslogado | Entrar sem `redirectTo`; depois, logado, abrir `/sign-in` | Termina em `/buscar` nos dois casos | |
| CT-96 | Deslogado | Abrir `/dashboard` e entrar | Volta para `/dashboard` | |
| CT-97 | Deslogado | Abrir `/` | Home com "Criar conta grátis" e a busca rápida | |
| CT-98 | CT-97 | Escolher um serviço na busca rápida e clicar em "Buscar" | Chega em `/buscar?servico=…` com o serviço já escolhido | |
| CT-99 | Logado | Abrir `/dashboard` com conta sem perfil e com perfil de prestador | Card "Encontre serviços" nos dois casos; o botão leva a `/buscar` | |

## Lugares do cadastro

| ID | Pré-condição | Passos | Resultado esperado | OK / Falhou |
|---|---|---|---|---|
| CT-100 | Logado, sem perfil; cidade real ainda sem linha em `geo_city` | Criar o perfil nessa cidade, com um bairro que existe nela | Toast imediato; em alguns segundos a cidade entra em `geo_city` e os bairros dela em `geo_place` com `origin = 'osm'` | |
| CT-101 | Perfil criado | Editar e adicionar o bairro `Xyzabc123` | Lugar com `origin = 'provider'` e a coordenada da sede; aviso "Não achamos Xyzabc123 no mapa…" no dashboard | |
| CT-102 | Logado | Forçar o salvamento com uma cidade que não existe na UF (ver CT-106); depois salvar com a cidade certa | Recusado com mensagem no campo de cidade; nada gravado. A cidade certa é gravada com o nome oficial | |
| CT-103 | Perfis no banco | Rodar `pnpm db:places` duas vezes | A segunda não consulta o mapa (termina na hora) e o resumo não muda | |
| CT-104 | CT-100, depois de a cidade carregar | Buscar pelo serviço do perfil, por distância (localização no bairro) e pela tela de bairro da cidade | O prestador aparece nos dois casos; o bairro traz a contagem | |

## Registro de execução

| Data | Quem executou | Commit | Navegador | Resultado |
|---|---|---|---|---|
| 13/11/2026 | Claude Code, com scripts Playwright (execução automatizada, não manual) | `fb4d298` | Chromium headless (Playwright 1.65), `pnpm dev` | CT-47 a CT-104: OK, com as ressalvas abaixo |
| | | | | |

Observações da execução de 13/11/2026:

- `pnpm test`: 87 testes, todos passando.
- A localização foi simulada pela API de geolocalização do Playwright, não pelo painel Sensors. Os passos de Drizzle Studio foram feitos por SQL direto no Postgres do Docker.
- **Aviso de permissão (CT-56, CT-61, CT-62):** o Chromium headless não mostra o aviso de localização; sem permissão ele responde "negado" na hora. Foi conferido que a página não chama a geolocalização ao abrir (CT-56), que escolher "Distância" chama uma vez (CT-62) e que a recusa mostra a mensagem, abre o painel no modo "Bairro" e põe o foco no botão de cidade (CT-61). Ver o aviso do navegador aparecer exige a passada manual.
- **Valores conferidos (borda e ordenação):** CT-47 a CT-49 e CT-50 com as distâncias da matriz ("≈ 100 m", "≈ 3,6 km", "≈ 4,4 km", "≈ 5,8 km", "≈ 7,3 km"); CT-52 vazio em 2 km e presente em 5 km (2,01 km); CT-55 "≈ 2,0 km"; CT-71 "≈ 7,2 km"; CT-81 e CT-82 na ordem exata da tabela; CT-83 com Eletro Mooca no topo.
- **CT-71:** com a localização em Pinheiros a cidade detectada foi Taboão da Serra/SP (a sede dela fica mais perto que a de São Paulo). É a limitação de divisa prevista na spec; o roteiro manda escolher São Paulo/SP.
- **CT-77, CT-78, CT-100, CT-104 (mapa real):** feitos com Porto Feliz/SP (136 bairros) e Salto/SP (81 bairros). O Overpass público estava lento e chegou a ficar fora do ar durante a execução (respostas 502 e de quase 30 s). Por isso, no CT-77 a primeira abertura mostrou a mensagem "Só demora na primeira vez", depois o aviso de bairros incompletos aos 15 s, e os bairros apareceram com "Tentar de novo" quando a carga em segundo plano terminou. No CT-100 a cidade entrou em `geo_city`, mas o toast levou 15 s em vez de ser imediato: o formulário já tinha uma carga de bairros pendente e o browser envia uma action por vez. Com o mapa respondendo normalmente a espera é a da própria consulta (poucos segundos).
- **CT-79:** feito com o `pnpm dev` reiniciado com `OVERPASS_URL` inválida: aviso e botão "Tentar de novo" conferidos. A segunda metade (corrigir a URL e os bairros aparecerem) é o mesmo caminho do CT-77.
- **CT-88:** vasculhados a URL, as tabelas `user`, `session`, `account`, `verification`, `provider_profile`, `provider_area` e `provider_service`, as respostas das actions e o log do `pnpm dev`. Esta execução achou e corrigiu um vazamento: o `next dev` imprimia os argumentos das actions (com as coordenadas) no terminal; `next.config.ts` passou a desligar esse log.
- **CT-89:** todas as requests do browser foram para `localhost:3000`; as coordenadas saíram só no corpo das actions, com 3 casas (`-23.55`, `-46.633`).
- **CT-90:** com a resposta da busca atrasada em 1 s, quatro esqueletos de 110 px, mesma altura dos cards.
- **CT-91:** o container do banco foi parado e religado durante o teste.
- **CT-93:** em 360 px, os três controles da barra na mesma linha, sem rolagem horizontal, painel dentro da tela.
- **Não executado:** a navegação só por teclado (critério de aceite da T3.6) e a conferência visual em navegador real. Falta uma passada manual para cumprir o roteiro como escrito.
- **Dados:** os prestadores de demonstração foram **mantidos de propósito** no banco local (não foi rodado `pnpm db:seed:demo --clean`). As contas de teste criadas na execução foram apagadas. Ficaram em `geo_place`/`geo_city` os bairros reais de Itu, Salto e Porto Feliz, carregados do mapa.
