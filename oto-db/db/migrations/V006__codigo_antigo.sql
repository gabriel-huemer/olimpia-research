-- V006 - Códigos antigos do pesquisador (RF20).
-- Redefinir o código não pode prender pesquisas que já estão na fila do aparelho: o código antigo
-- deixa de servir para entrar, mas continua identificando de quem são essas pesquisas.
SET search_path = oto, public;

CREATE TABLE codigo_antigo (
    codigo       varchar(10) PRIMARY KEY,
    usuario_id   uuid        NOT NULL REFERENCES usuario(id),
    trocado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_codigo_antigo_usuario ON codigo_antigo (usuario_id);

GRANT SELECT, INSERT ON codigo_antigo TO oto_web;
GRANT SELECT ON codigo_antigo TO oto_mobile;
