# Curadoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (execução direta, sem subagentes).

**Goal:** a tela Revisão lê e decide sinalizações reais do PostgreSQL.
**Architecture:** regras puras em `lib/curadoria/valor.ts`, SQL em `lib/curadoria/curadoria.ts`, rotas `/api/curadoria`.
**Tech Stack:** Next 16, pg, `node --test`.
**Spec:** `docs/superpowers/specs/2026-11-23-curadoria-design.md`

## Global Constraints
- Integração só no `oto_teste`; `git add` com caminhos explícitos; nenhuma migração nova; `oto_web` não tem DELETE.
- Aprovar/corrigir: Coleta. Excluir: Coleta e Sistema. Autor sempre da sessão. Motivo até 500 caracteres.

## Review Focus
- Duas respostas da mesma pesquisa decididas juntas: a pesquisa termina CONCLUIDA (trava em `pesquisa`).
- Resposta sinalizada sem valor: corrigir insere o valor.
- Dois alertas na mesma resposta: um item na fila, uma decisão resolve ambos.
- Valor em formato brasileiro ("1.234,50") e valores absurdos, negativos ou que estouram numeric(14,2).
- Id malformado ou enorme na URL: 404, não 500.

## Tasks
- [x] 1. `validarNovoValor(tipo, bruto): {ok:true,numero}|{ok:false,motivo}` e `foraDaFaixa(n, {min,max}|null)`; `test/curadoria-valor.test.mjs`.
- [x] 2. Ingestão: reproduzir e corrigir sinalização sem valor e alerta duplo (`ingestao.ts`).
- [x] 3. `listarFila()`, `contarPendentes()`, `detalhar(id)`, `decidir(usuario, id, corpo)` e rotas; `test/curadoria.integration.test.mjs`.
- [x] 4. Tirar `CURAR_RESPOSTA` e `revisao` de `/api/state`, do contexto e do seed; `pendentesRevisao` do banco.
- [x] 5. Tela Revisão; conferência no navegador.
- [ ] 6. Docs, revisão do diff, PR para a `stage`.
