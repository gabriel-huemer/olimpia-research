-- Cria/atualiza os papéis de login e as configurações de segurança do banco.
-- Idempotente: pode ser executado novamente (por ex. para trocar senhas).
-- Senhas lidas das variáveis de ambiente (não aparecem na linha de comando).
\set ON_ERROR_STOP on
\getenv web_pw      OTO_WEB_PASSWORD
\getenv mobile_pw   OTO_MOBILE_PASSWORD
\getenv readonly_pw OTO_READONLY_PASSWORD

SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE', r)
FROM unnest(ARRAY['oto_web','oto_mobile','oto_readonly']) AS r
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) \gexec

ALTER ROLE oto_web      WITH LOGIN CONNECTION LIMIT 40;
ALTER ROLE oto_mobile   WITH LOGIN CONNECTION LIMIT 60;
ALTER ROLE oto_readonly WITH LOGIN CONNECTION LIMIT 10;

SELECT format('ALTER ROLE oto_web      PASSWORD %L', :'web_pw')      \gexec
SELECT format('ALTER ROLE oto_mobile   PASSWORD %L', :'mobile_pw')   \gexec
SELECT format('ALTER ROLE oto_readonly PASSWORD %L', :'readonly_pw') \gexec

ALTER ROLE oto_web      SET search_path = oto, public;
ALTER ROLE oto_mobile   SET search_path = oto, public;
ALTER ROLE oto_readonly SET search_path = oto, public;

-- Limites de tempo para evitar consultas penduradas
ALTER ROLE oto_web      SET statement_timeout = '60s';
ALTER ROLE oto_mobile   SET statement_timeout = '30s';
ALTER ROLE oto_readonly SET statement_timeout = '120s';
ALTER ROLE oto_web      SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE oto_mobile   SET idle_in_transaction_session_timeout = '30s';

-- Banco: fuso de Brasília e só os papéis do OTO conseguem conectar
SELECT format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Sao_Paulo') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO oto_web, oto_mobile, oto_readonly', current_database()) \gexec
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO oto_web, oto_mobile, oto_readonly;   -- pgcrypto/funções utilitárias
