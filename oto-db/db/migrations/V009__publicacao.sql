-- V009 - Indicadores aprovados para o site da Prefeitura (RF21). Sem linha = não publicado.
SET search_path = oto, public;

CREATE TABLE publicacao_item (
    id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          varchar(40) NOT NULL UNIQUE,
    publico         boolean     NOT NULL DEFAULT false,
    alterado_por    uuid        NOT NULL REFERENCES usuario(id),
    alterado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON publicacao_item
    FOR EACH ROW EXECUTE FUNCTION fn_auditar();
GRANT SELECT, INSERT, UPDATE ON publicacao_item TO oto_web;
