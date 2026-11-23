-- V004 - Código estável para itens de avaliação (serviços e atrativos).
-- O app do pesquisador envia cada item como uma chave própria (ex.: servico_27, atrativo_41);
-- a API de sincronização usa este código para localizar o item e gravar em avaliacao_item.
SET search_path = oto, public;

ALTER TABLE item_avaliacao ADD COLUMN codigo varchar(60);
CREATE UNIQUE INDEX ux_item_avaliacao_codigo ON item_avaliacao (codigo) WHERE codigo IS NOT NULL;
