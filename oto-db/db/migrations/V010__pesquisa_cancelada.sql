-- V010 - Entrevistas canceladas no app (RF23): só o motivo. As respostas são apagadas no aparelho e nunca chegam aqui.
SET search_path = oto, public;

CREATE TABLE pesquisa_cancelada (
    id              uuid         PRIMARY KEY,
    pesquisador_id  uuid         NOT NULL REFERENCES usuario(id),
    motivo          varchar(100) NOT NULL CHECK (btrim(motivo) <> ''),
    iniciada_em     timestamptz  NOT NULL,
    cancelada_em    timestamptz  NOT NULL,
    recebida_em     timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_cancelada_datas CHECK (cancelada_em >= iniciada_em)
);
CREATE INDEX ix_cancelada_periodo ON pesquisa_cancelada (cancelada_em);
GRANT SELECT, INSERT ON pesquisa_cancelada TO oto_mobile;
GRANT SELECT ON pesquisa_cancelada TO oto_web;
