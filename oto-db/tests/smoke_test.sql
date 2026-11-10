-- Teste de fumaça: estrutura, regras de integridade e permissões de cada perfil.
-- Roda tudo dentro de uma transação e faz ROLLBACK: não deixa nenhum dado no banco.
--   make test     ou     psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -U <admin> -d oto -f tests/smoke_test.sql
\set ON_ERROR_STOP on
BEGIN;
SET search_path = oto, public;

CREATE FUNCTION pg_temp.afirma(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS
$$ BEGIN IF NOT cond THEN RAISE EXCEPTION 'FALHA: %', msg; END IF; RAISE NOTICE 'ok  - %', msg; END $$;

-- executa cmd como o papel r e exige que seja NEGADO
CREATE FUNCTION pg_temp.nega(r text, cmd text, msg text) RETURNS void LANGUAGE plpgsql AS
$$ BEGIN
  EXECUTE format('SET LOCAL ROLE %I', r);
  BEGIN
    EXECUTE cmd;
    RESET ROLE;
    RAISE EXCEPTION 'FALHA: % conseguiu (%)', r, msg;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; RAISE NOTICE 'ok  - negado: % (%)', msg, r;
  END;
END $$;

-- executa cmd como o papel r e exige que seja PERMITIDO
CREATE FUNCTION pg_temp.permite(r text, cmd text, msg text) RETURNS void LANGUAGE plpgsql AS
$$ BEGIN
  EXECUTE format('SET LOCAL ROLE %I', r); EXECUTE cmd; RESET ROLE;
  RAISE NOTICE 'ok  - permitido: % (%)', msg, r;
END $$;

-- ===== 1. Estrutura
SELECT pg_temp.afirma((SELECT count(*) FROM information_schema.tables
        WHERE table_schema='oto' AND table_type='BASE TABLE' AND table_name <> 'schema_migrations') = 30,
        '30 tabelas do modelo');
SELECT pg_temp.afirma((SELECT count(*) FROM uf) = 27, '27 UFs carregadas');
SELECT pg_temp.afirma((SELECT count(*) FROM pais) >= 249, 'países carregados');
SELECT pg_temp.afirma((SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_auditoria') = 20,
        '20 tabelas com trigger de auditoria');

-- ===== 2. Fixtures mínimas (como dono do banco)
INSERT INTO municipio VALUES (3543402,'Ribeirão Preto','SP') ON CONFLICT DO NOTHING;
INSERT INTO local_coleta (nome) VALUES ('Local de Teste');
INSERT INTO usuario (id,nome,perfil,codigo_acesso) VALUES ('11111111-1111-1111-1111-111111111111','Pesq Teste','PESQUISADOR','TST001');
INSERT INTO usuario (id,nome,perfil,email,senha_hash) VALUES ('99999999-9999-9999-9999-999999999999','Adm Teste','ADMINISTRADOR','t@t.com','HASH-SECRETO');
INSERT INTO dispositivo (id,usuario_id) VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111');
INSERT INTO formulario (nome) VALUES ('Form Teste');
INSERT INTO formulario_versao (formulario_id,numero,publicada) SELECT id,1,true FROM formulario WHERE nome='Form Teste';
INSERT INTO secao (formulario_versao_id,ordem,titulo) SELECT id,1,'Perfil' FROM formulario_versao ORDER BY id DESC LIMIT 1;
INSERT INTO pergunta (secao_id,ordem,codigo,enunciado,tipo) SELECT id,1,'IDADE_T','Idade?','NUMERO' FROM secao ORDER BY id DESC LIMIT 1;

-- ===== 3. Perfil MOBILE: coleta e sincronização
SELECT pg_temp.permite('oto_mobile', 'SELECT count(*) FROM pergunta', 'ler estrutura do formulário');
SELECT pg_temp.permite('oto_mobile', 'SELECT count(*) FROM municipio', 'ler municípios');
SELECT pg_temp.permite('oto_mobile', 'SELECT codigo_acesso FROM usuario', 'login por código (colunas liberadas)');
SELECT pg_temp.permite('oto_mobile',
  $q$INSERT INTO lote_sincronizacao (id,dispositivo_id,usuario_id) VALUES ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111')$q$,
  'abrir lote de sincronização');
SELECT pg_temp.permite('oto_mobile',
  $q$INSERT INTO pesquisa (id,protocolo,numero_local,formulario_versao_id,pesquisador_id,dispositivo_id,iniciada_em,finalizada_em,lote_sincronizacao_id)
     SELECT '33333333-3333-3333-3333-333333333333','TST001-0001',1,(SELECT max(id) FROM formulario_versao),
            '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',now()-interval '5 min',now(),'44444444-4444-4444-4444-444444444444'$q$,
  'enviar pesquisa');
SELECT pg_temp.permite('oto_mobile',
  $q$INSERT INTO pesquisa (id,protocolo,numero_local,formulario_versao_id,pesquisador_id,dispositivo_id,iniciada_em,finalizada_em)
     SELECT '33333333-3333-3333-3333-333333333333','TST001-0001',1,(SELECT max(id) FROM formulario_versao),
            '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',now(),now()
     ON CONFLICT (id) DO NOTHING$q$,
  'reenvio idempotente (ON CONFLICT DO NOTHING)');
SELECT pg_temp.afirma((SELECT count(*) FROM pesquisa WHERE protocolo='TST001-0001') = 1, 'reenvio não duplicou a pesquisa');
SELECT pg_temp.permite('oto_mobile',
  $q$INSERT INTO resposta (pesquisa_id,pergunta_id,situacao) SELECT '33333333-3333-3333-3333-333333333333',id,'SUSPEITA' FROM pergunta WHERE codigo='IDADE_T'$q$,
  'enviar resposta');
SELECT pg_temp.permite('oto_mobile', $q$INSERT INTO resposta_valor (resposta_id,valor_numero) SELECT max(id),500 FROM resposta$q$, 'enviar valor');
SELECT pg_temp.permite('oto_mobile',
  $q$INSERT INTO sinalizacao (resposta_id,motivo,valor_original,decisao_no_app) SELECT max(id),'Idade fora do esperado','{"idade":500}','MANTIDA_E_SINALIZADA' FROM resposta$q$,
  'enviar sinalização');

SELECT pg_temp.nega('oto_mobile', 'SELECT senha_hash FROM usuario', 'ler senha_hash');
SELECT pg_temp.nega('oto_mobile', 'SELECT email FROM usuario', 'ler e-mail de usuários');
SELECT pg_temp.nega('oto_mobile', 'DELETE FROM pesquisa', 'apagar pesquisa');
SELECT pg_temp.nega('oto_mobile', $q$UPDATE resposta_valor SET valor_numero = 1$q$, 'alterar resposta já enviada');
SELECT pg_temp.nega('oto_mobile', $q$UPDATE sinalizacao SET status = 'APROVADA'$q$, 'aprovar a própria sinalização');
SELECT pg_temp.nega('oto_mobile', 'SELECT * FROM log_auditoria', 'ler log de auditoria');
SELECT pg_temp.nega('oto_mobile', 'SELECT * FROM dashboard', 'ler dashboards');
SELECT pg_temp.nega('oto_mobile', $q$INSERT INTO formulario (nome) VALUES ('x')$q$, 'criar formulário');

-- ===== 4. Perfil WEB: gestão, curadoria, auditoria
SELECT pg_temp.permite('oto_web', 'SELECT * FROM vw_fila_curadoria', 'ver fila de curadoria');
SELECT pg_temp.permite('oto_web', $q$SELECT set_config('app.usuario_id','99999999-9999-9999-9999-999999999999', true)$q$, 'informar usuário da sessão');
SELECT pg_temp.permite('oto_web', $q$UPDATE resposta_valor SET valor_numero = 50$q$, 'corrigir valor na curadoria');
SELECT pg_temp.permite('oto_web', $q$UPDATE resposta SET situacao = 'CORRIGIDA'$q$, 'marcar resposta corrigida');
SELECT pg_temp.permite('oto_web', $q$UPDATE sinalizacao SET status='CORRIGIDA', curador_id='99999999-9999-9999-9999-999999999999', curada_em=now(), valor_corrigido='{"idade":50}'$q$, 'fechar sinalização');
SELECT pg_temp.permite('oto_web', $q$INSERT INTO dashboard (nome,dono_id) VALUES ('Painel T','99999999-9999-9999-9999-999999999999')$q$, 'criar dashboard');
SELECT pg_temp.permite('oto_web', 'SELECT count(*) FROM log_auditoria', 'consultar auditoria');

SELECT pg_temp.nega('oto_web', 'DELETE FROM pesquisa', 'apagar pesquisa');
SELECT pg_temp.nega('oto_web', 'DELETE FROM resposta', 'apagar resposta');
SELECT pg_temp.nega('oto_web', $q$UPDATE log_auditoria SET acao = 'X'$q$, 'alterar log de auditoria');
SELECT pg_temp.nega('oto_web', 'DELETE FROM log_auditoria', 'apagar log de auditoria');
SELECT pg_temp.nega('oto_web', 'CREATE TABLE oto.hack (x int)', 'criar tabelas (DDL)');

-- ===== 5. Perfil READONLY
SELECT pg_temp.permite('oto_readonly', 'SELECT count(*) FROM pesquisa', 'ler pesquisas');
SELECT pg_temp.permite('oto_readonly', 'SELECT count(*) FROM vw_resposta_valida', 'ler view de respostas válidas');
SELECT pg_temp.nega('oto_readonly', 'SELECT senha_hash FROM usuario', 'ler senha_hash');
SELECT pg_temp.nega('oto_readonly', 'SELECT codigo_acesso FROM usuario', 'ler códigos de acesso');
SELECT pg_temp.nega('oto_readonly', 'SELECT * FROM log_auditoria', 'ler auditoria');
SELECT pg_temp.nega('oto_readonly', $q$INSERT INTO local_coleta (nome) VALUES ('x')$q$, 'escrever');

-- ===== 6. Regras de integridade e auditoria
SELECT pg_temp.afirma((SELECT count(*) FROM vw_resposta_valida) = 1, 'view de respostas válidas inclui a CORRIGIDA');
SELECT pg_temp.afirma((SELECT usuario_id::text FROM log_auditoria WHERE entidade='resposta_valor' AND acao='UPDATE' LIMIT 1) = '99999999-9999-9999-9999-999999999999',
        'auditoria registrou o usuário da alteração (via app.usuario_id)');
SELECT pg_temp.afirma((SELECT dados_antes->>'valor_numero' FROM log_auditoria WHERE entidade='resposta_valor' AND acao='UPDATE' LIMIT 1) = '500.00',
        'auditoria guardou o valor anterior (500)');
SELECT pg_temp.afirma(NOT EXISTS (SELECT 1 FROM log_auditoria WHERE dados_antes ? 'senha_hash' OR dados_depois ? 'senha_hash'),
        'hash de senha nunca aparece no log de auditoria');
SELECT pg_temp.afirma(NOT EXISTS (SELECT 1 FROM log_auditoria WHERE entidade='resposta_valor' AND acao='INSERT'),
        'INSERT em tabela de alto volume não gera log (decisão de projeto)');
DO $$ BEGIN
  BEGIN UPDATE log_auditoria SET acao='X'; RAISE EXCEPTION 'FALHA: log editável';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHA%' THEN RAISE; END IF; RAISE NOTICE 'ok  - log de auditoria é imutável (até para o dono)'; END;
END $$;
DO $$ BEGIN
  BEGIN INSERT INTO usuario (nome,perfil) VALUES ('Sem credencial','PESQUISADOR'); RAISE EXCEPTION 'FALHA: aceitou pesquisador sem código';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  - pesquisador exige código de acesso (CHECK)'; END;
END $$;

ROLLBACK;
\echo '== TODOS OS TESTES PASSARAM (transação revertida, nada foi gravado) =='
