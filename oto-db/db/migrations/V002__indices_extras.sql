-- V002 - Índices nas chaves estrangeiras mais consultadas por Web e Mobile
SET search_path = oto, public;

CREATE INDEX ix_pesquisa_dispositivo   ON pesquisa (dispositivo_id);
CREATE INDEX ix_pesquisa_local         ON pesquisa (local_coleta_id);
CREATE INDEX ix_pesquisa_versao        ON pesquisa (formulario_versao_id);
CREATE INDEX ix_pesquisa_lote          ON pesquisa (lote_sincronizacao_id) WHERE lote_sincronizacao_id IS NOT NULL;
CREATE INDEX ix_pesquisa_importacao    ON pesquisa (importacao_id)         WHERE importacao_id IS NOT NULL;
CREATE INDEX ix_sinalizacao_resposta   ON sinalizacao (resposta_id);
CREATE INDEX ix_dispositivo_usuario    ON dispositivo (usuario_id);
CREATE INDEX ix_lote_dispositivo       ON lote_sincronizacao (dispositivo_id, iniciado_em DESC);
CREATE INDEX ix_item_avaliacao_estab   ON item_avaliacao (estabelecimento_id) WHERE estabelecimento_id IS NOT NULL;
CREATE INDEX ix_regra_exibicao_pergunta ON regra_exibicao (pergunta_id);
CREATE INDEX ix_regra_validacao_pergunta ON regra_validacao (pergunta_id);
CREATE INDEX ix_widget_dashboard       ON dashboard_widget (dashboard_id);
CREATE INDEX ix_importacao_erro        ON importacao_erro (importacao_id);
