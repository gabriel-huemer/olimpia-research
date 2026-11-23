# Curadoria (tela Revisão) no banco de verdade

Status: aprovado pelo Hugo em 2026-11-23. Requisitos: RF13, RF19, RN13, RN18.

## Intenção
O gestor revisa as respostas suspeitas enviadas pelo app e a decisão vale nos indicadores, com autor registrado.
Hoje a tela mostra exemplos em memória; o UPDATE em `sinalizacao` não informa o curador, o banco recusa
(`ck_sinalizacao_curada`) e o painel engole o erro, dizendo que registrou.

## Decidido com o Hugo
1. Excluir tira **só a resposta suspeita** dos indicadores; o resto da pesquisa continua valendo. Nada é apagado.
2. **Excluir exige a área Sistema.** Aprovar e corrigir exigem Coleta. A página é de Coleta, então quem exclui tem as
   duas áreas. Sem Sistema, o botão Excluir não aparece e a API responde 403.
3. Em alertas de contradição, nesta etapa corrige-se **só a resposta marcada**; a tela mostra todas para conferir.
4. Construção: rotas próprias (abordagem A).

## Regras
| Decisão | Motivo | `resposta.situacao` / `sinalizacao.status` | Valor |
|---|---|---|---|
| Aprovar | opcional | APROVADA | mantém |
| Corrigir | obrigatório | CORRIGIDA | grava o novo em `resposta_valor`; original fica em `valor_original` |
| Excluir | obrigatório | EXCLUIDA | mantém, fora dos indicadores |

- Uma transação com `withAuditTransaction`: sinalização (curador, data, justificativa, valor corrigido), resposta, valor
  e, sem pendências restantes, `pesquisa.status_curadoria = CONCLUIDA`. Erro desfaz tudo e aparece na tela.
- Curador e autor da auditoria vêm da sessão, nunca do corpo da requisição.
- Item já decidido: 409. Item inexistente: 404. A pesquisa é travada (`FOR UPDATE`) para decisões simultâneas.
- Valor novo validado pelo tipo da pergunta. Fora da faixa da regra: avisa, não bloqueia (RN13).
- Motivo até 500 caracteres. Os campos motivo e valor começam vazios.
- Se a mesma resposta tiver mais de um alerta pendente, a decisão vale para todos os alertas dela.
- Fila: mais antiga primeiro. Estados da tela: carregando, vazia, erro, enviando (botões travados).

## Rotas
- `GET /api/curadoria`: fila pendente. `GET /api/curadoria/[id]`: pesquisa e todas as respostas. Exigem Coleta.
- `POST /api/curadoria/[id]`: `{ decisao, novoValor?, motivo? }`. Exige Coleta (e Sistema para EXCLUIR) e Origin do site.
- Sai do `/api/state`: ação `CURAR_RESPOSTA` e a coleção `revisao`. O número de pendentes (menu e Visão geral) vem do banco.

## Ingestão
Pelo código, a sinalização se perde quando a pergunta marcada chega sem valor e quando a mesma pergunta tem dois alertas.
Primeiro um teste que reproduza; se confirmado, gravar a resposta marcada mesmo sem valor e todos os alertas.

## Abordagens
- **A (escolhida):** rotas próprias. Separa da memória e carrega só o necessário.
- **B:** dentro do `/api/state`. Menos arquivos, mas mistura com exemplos e recarrega tudo a cada 15 s.

## Fora desta etapa
Desfazer decisão, tela Auditoria, corrigir outra resposta da contradição, novo perfil "gestor".

## Testes
Escritos antes do código; integração só no `oto_teste`. Cobrem: cada decisão e o efeito no Panorama, motivo obrigatório,
permissões (Coleta sem Sistema não exclui), 404/409, duas decisões simultâneas, valor inválido sem gravar nada, autor na
auditoria, pesquisa concluída só sem pendências e os dois casos da ingestão.

## Entrega
Branch `feat/curadoria`, PR para a `stage`. Escolhas do construtor: nomes internos e textos curtos de erro.
