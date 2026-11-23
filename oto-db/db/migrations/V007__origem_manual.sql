-- V007 - Origem MANUAL para pesquisas digitadas no painel (RF17).
-- O valor novo do enum só pode ser usado depois do commit: as regras que o usam estão na V008.
SET search_path = oto, public;
ALTER TYPE origem_pesquisa ADD VALUE IF NOT EXISTS 'MANUAL';
