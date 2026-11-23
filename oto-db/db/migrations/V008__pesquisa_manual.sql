-- V008 - Pesquisas digitadas no painel (RF17): canal de recebimento, autor e protocolo próprio.
SET search_path = oto, public;

ALTER TABLE pesquisa ADD COLUMN canal varchar(60);
ALTER TABLE pesquisa ADD COLUMN registrada_por uuid REFERENCES usuario(id);
ALTER TABLE pesquisa DROP CONSTRAINT ck_pesquisa_origem;
ALTER TABLE pesquisa ADD CONSTRAINT ck_pesquisa_origem CHECK (
    (origem = 'CAMPO'      AND pesquisador_id IS NOT NULL AND dispositivo_id IS NOT NULL) OR
    (origem = 'IMPORTACAO' AND importacao_id IS NOT NULL) OR
    (origem = 'MANUAL'     AND registrada_por IS NOT NULL AND canal IS NOT NULL)
);
CREATE INDEX ix_pesquisa_hash ON pesquisa (hash_dedup) WHERE hash_dedup IS NOT NULL;

CREATE SEQUENCE seq_protocolo_manual;
CREATE SEQUENCE seq_protocolo_importacao;
GRANT USAGE ON SEQUENCE seq_protocolo_manual, seq_protocolo_importacao TO oto_web;
