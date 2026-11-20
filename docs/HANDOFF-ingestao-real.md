# Handoff — branch `feat/ingestao-real`

Data: 2026-11-19. Sessão do Claude que cuidava de rodar o projeto, ligar app e painel ao mesmo banco real e criar testes/CI.

## O que foi feito (commits `628d233`, `d1dcb5d`, `c4fd9dc`, `5f04606`)
- **Ingestão real**: o app Flutter envia pesquisas para `/api/v1/pesquisas/lote`, que grava no PostgreSQL (`dashboard/src/lib/ingestao/`). A rota antiga `/api/sync/lote` foi removida.
- **Panorama e lista de Pesquisas** agora leem do banco (`lib/panorama.ts`, `lib/pesquisas.ts`, `api/analytics`), não mais de números mockados.
- **Banco**: `V004__item_avaliacao_codigo.sql`, seeds `S04_formulario` e `S05_pesquisadores`, script `gerar_seed_formulario.py`.
- **Banco demo** (`oto-db/demo/`, `popular_demo.py`): segundo banco `oto_demo` com dados fictícios para gravar vídeo. Ver `oto-db/demo/README.md` e o README principal para quando usar cada banco. Já foi testado: pesquisa enviada pelo app apareceu no painel.
- **CI** (`.github/workflows/ci.yml`): jobs do painel e do app, mais job de integração com Postgres.
- **Testes**:
  - Painel: conversão, Excel, Panorama, lista de Pesquisas, sync em lote, ações do painel (curadoria, operadores, usuários).
  - App Flutter: contrato HTTP, fila de sincronização, regras de suspeição, login/pesquisa, payload.
  - Último resultado: painel 11 unitários e 27 de integração passando (em banco isolado); Flutter 41 passando.
- Pesquisa de formato de exportação para o prefeito: 3 layouts completos com dados semanais foram feitos como artefatos e enviados a ele (nada de código de exportação ainda).

## Onde parou
Os 4 commits estavam só locais. Faltava abrir o PR, dependendo de acesso de escrita ao repo do Gabriel (`gabriel-huemer/olimpia-research`).

## Próximos passos
1. Abrir PR `feat/ingestao-real` → `main` e ver o CI rodar; corrigir o que falhar.
2. **SonarCloud**: restaurar o scan (alinhar project key/org, secret `SONAR_TOKEN`, gerar cobertura Flutter/painel, recriar o workflow). Depende de acesso.
3. **Exportação**: aguardar resposta do prefeito (formato PDF/PPTX/Excel, regras vs. sugestões revisadas, filtros, identidade visual) e então implementar.
4. Migrar as telas ainda mockadas para o banco, decidindo quais precisam persistir antes do lançamento.
5. Lacunas de teste: mappers do app (`questionnaire_mapper`, `survey_mapper`), widgets de autocomplete/escolha, e login/permissões do painel (feito na branch `feat/auth-rbac`).

## Atenção
- **Possível bug**: na curadoria, `CURAR_RESPOSTA` executa `UPDATE oto.sinalizacao ... WHERE id = <id do item de exemplo>`. Os ids dos itens de exemplo colidem com sinalizações reais (ids 1–10 no banco demo). Os testes de integração do `state` só devem rodar em banco descartável, nunca no `oto_demo`. Deve sumir quando a curadoria usar o banco de verdade.
- `oto-db/db/seeds/S03_municipios.sql` é gerado por `oto-db/scripts/carregar_municipios_ibge.py` (precisa de internet) e não está versionado de propósito. Rode o script ao subir o banco numa máquina nova.
- Ambiente: Docker Desktop com Postgres, Flutter instalado localmente, painel Next.js na porta 3000. Máquina com pouca memória: o `next dev` foi encerrado algumas vezes por falta de RAM.
