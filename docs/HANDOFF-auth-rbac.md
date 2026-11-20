# Handoff — branch `feat/auth-rbac`

Data: 2026-11-19. Sessão do Claude que trabalhava em login e permissões do painel (dashboard).

## Objetivo
- Aba **Análises** pública (dados abertos por lei). Abas **Coleta** e **Sistema** só com login.
- 3 perfis padrão: `ADMINISTRADOR`, `PESQUISADOR`, `VISUALIZADOR`.
  - Admin pode criar perfis novos e editar o que cada perfil enxerga.
  - VISUALIZADOR só enxerga Análises.
  - PESQUISADOR não entra no painel web (só no app).
- Criar 3 contas de teste (uma de cada perfil) para o Hugo ver funcionando.
- Abordagem: TDD, com atenção a segurança.

## O que foi feito (só testes, NADA implementado)
Testes escritos primeiro e confirmados **vermelhos**, porque `dashboard/src/lib/auth/*` não existe:

| Arquivo (`dashboard/test/`) | Cobre |
|---|---|
| `auth-permissoes.test.mjs` | Permissões dos 3 perfis; mapa rota→área (inclui `/coletar`, `/analises/../coleta`); área desconhecida nega. |
| `auth-token.test.mjs` | Cookie de sessão assinado: secret errado, payload adulterado, expirado, `alg=none` e outro algoritmo rejeitados; secret curto recusado. |
| `auth-senha.test.mjs` | bcrypt (inclusive hashes gerados pelo Postgres); usuário inexistente ainda gasta uma comparação bcrypt (anti-enumeração); regras de força de senha. |
| `auth-limitador.test.mjs` | Bloqueio por força bruta: janela, expiração, reset no sucesso, teto de memória. |
| `auth-origem.test.mjs` | Checagem de Origin/Referer (CSRF) e redirect aberto pós-login. |
| `auth.integration.test.mjs` | HTTP ponta a ponta (`npm run test:auth`, precisa do painel rodando). |

`dashboard/package.json`: os 5 unitários foram adicionados ao `npm test` e criado `npm run test:auth`.

A branch nasceu de `feat/ingestao-real` (já contém os commits de ingestão e testes do outro handoff).

## Onde parou
Hugo mandou criar a branch e fazer os testes antes. Os testes estão prontos e falhando. A pergunta pendente era "posso implementar?" — a resposta natural é sim.

## Próximos passos
1. `cd dashboard && npm i jose bcryptjs` (os testes exigem `jose`; confira a lib de bcrypt que `auth-senha.test.mjs` importa).
2. Criar `dashboard/src/lib/auth/` (permissoes, token, senha, limitador, origem) até `npm test` ficar verde.
3. Migration no `oto-db` (`V005__...`): tabelas de usuário/perfil/permissão por área.
4. Seed com 3 contas (admin, visualizador, pesquisador). Senhas fortes, fora do git, via variável de ambiente ou saída do script.
5. `middleware.ts`: Análises e `/api/analytics` públicos; Coleta, Sistema e `/api/state` exigem sessão e permissão. Cookie httpOnly + Secure + SameSite, sem confiar no campo `usuario` do corpo da requisição.
6. Tela `/login`, logout, e tela de admin para criar perfis e editar permissões.
7. Rodar `npm run test:auth` contra o painel local (banco demo `oto_demo`, porta 3000) até passar.
8. Garantir que o endpoint de sync do app (`/api/v1/pesquisas/lote`) continua exigindo token e não quebrou.
9. Abrir PR para `main`.

## Atenção
- Não rode os testes de integração do painel contra `oto_demo`: `CURAR_RESPOSTA` pode alterar sinalizações reais (ver handoff da ingestão).
