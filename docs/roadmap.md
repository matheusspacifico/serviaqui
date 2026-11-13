# Roadmap

Tasks pequenas (1 task = 1 commit), ligadas às atividades (ATxx) do documento de cronograma.
Ordem segue as dependências do cronograma.

## Fase 0 — Design system

- [x] DS-01 Tokens de cor quentes + semânticos (success, warning, rating)
- [x] DS-02 Tipografia (Geist no corpo, Bricolage Grotesque nos títulos)
- [x] DS-03 Componentes shadcn base (badge, avatar, separator, textarea, select, skeleton, sonner)
- [x] DS-04 Componentes de domínio (logo, rating-stars, site-header, auth-shell)
- [x] DS-05 Aplicar nas telas existentes
- [x] DS-06 Vitrine em `/design`
- [x] DS-07 Documentar no `CLAUDE.md`

## Fase 1 — Fechar autenticação (pacote 2.0)

- [x] T1.1 Validação client-side (formato de e-mail, senha mínima) com mensagens em pt-BR — AT05
- [x] T1.2 Mensagem clara para e-mail já cadastrado — AT05
- [x] T1.3 Registrar que o hash do Better Auth (scrypt) atende ao requisito — AT06
- [x] T1.4 Proteger rotas logadas e redirecionar usuário logado para fora das telas de auth — AT07
- [x] T1.5 Roteiro de teste de cadastro, login e recuperação de senha — AT09

## Fase 2 — Perfil do prestador (pacote 1.1)

- [x] T2.1 Definir campos: nome, telefone/WhatsApp, serviços, bairros, valor/hora, descrição — AT01
- [x] T2.2 Tabelas `provider_profile`, `service_category`, `provider_service`, `provider_area` — AT02
- [x] T2.3 Seed de categorias de serviço — AT02
- [x] T2.4 Server action de criar/editar perfil — AT02
- [x] T2.5 Tela de cadastro do prestador (decidir formato: formulário em etapas ou chat) — AT02
- [x] T2.6 Página pública do perfil `/prestador/[id]` — AT02
- [x] T2.7 Teste do cadastro — AT03

## Fase 3 — Busca geolocalizada (pacote 2.1)

- [x] T3.1 Definir algoritmo: serviço + bairro/raio, distância Haversine — AT10
- [x] T3.2 Cidades (lista do IBGE), bairros e coordenadas (OpenStreetMap/Overpass) em `geo_place` — AT11
- [x] T3.3 Localização do cliente pelo browser, com fallback para cidade e bairro escolhidos — AT11
- [x] T3.4 Query de busca por serviço + raio — AT11
- [ ] T3.5 Ordenação por avaliação e distância — AT12
- [ ] T3.6 Tela `/buscar` com filtros e cards de resultado — AT13
- [ ] T3.7 Estados vazio, carregando e erro — AT13
- [ ] T3.8 Cenários de teste de bairro/raio — AT14
- [ ] T3.9 Cadastro do prestador: cidade pela lista oficial, autocompletar de bairros e sugestão por bairro de referência + raio; limite de 30 bairros — AT02/AT11

## Fase 4 — Contato direto (pacote 2.2)

- [ ] T4.1 Botão WhatsApp (`wa.me` com mensagem pronta) — AT15
- [ ] T4.2 Botão ligar (`tel:`) — AT16
- [ ] T4.3 Registrar evento de contato (base para liberar avaliação) — AT15/AT18
- [ ] T4.4 Teste do fluxo de contato — AT17

## Fase 5 — Avaliação (pacote 3.1)

- [ ] T5.1 Tabela `review` (nota 1–5, comentário, cliente, prestador) — AT18
- [ ] T5.2 Tela/dialog de avaliação com `RatingStars` — AT18
- [ ] T5.3 Recalcular média e contagem no perfil — AT19
- [ ] T5.4 Exibir reputação no perfil e na busca — AT19
- [ ] T5.5 Teste do cálculo de reputação — AT20

## Fase 6 — Requisitos não funcionais

- [ ] T6.1 Medir e garantir criação de perfil < 30s — AT27–AT29
- [ ] T6.2 TLS no deploy (HTTPS) — AT30
- [ ] T6.3 Criptografia AES-256 de dados sensíveis (telefone, localização) — AT31
- [ ] T6.4 Anonimização de localização após 90 dias — AT32
- [ ] T6.5 Checklist de conformidade LGPD — AT33
- [ ] T6.6 Dockerfile da app + compose com réplicas e nginx como load balancer — AT21–AT22
- [ ] T6.7 Teste de carga (k6) — AT23
- [ ] T6.8 Healthcheck + monitoramento simples — AT24–AT26
