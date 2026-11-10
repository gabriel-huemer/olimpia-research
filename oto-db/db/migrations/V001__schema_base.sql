-- =====================================================================
-- OTO - Observatório de Turismo de Olímpia
-- V001 - Modelo de banco de dados central (PostgreSQL 13+)
-- Requisitos cobertos: RF05, RF07, RF08, RF09, RF13, RF14, RF15, RF16,
--                      RF19 e RNF12 (base única centralizada)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS oto;
SET search_path = oto, public;

-- ---------------------------------------------------------------------
-- 0. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE perfil_usuario     AS ENUM ('ADMINISTRADOR', 'PESQUISADOR', 'VISUALIZADOR');

CREATE TYPE tipo_pergunta      AS ENUM (
    'TEXTO',               -- resposta aberta (usar com moderação)
    'NUMERO',              -- ex.: idade
    'MOEDA',               -- ex.: gasto médio diário
    'DATA',                -- ex.: chegada / partida
    'BOOLEANO',            -- Sim / Não
    'UNICA_ESCOLHA',       -- radio / dropdown
    'MULTIPLA_ESCOLHA',    -- chips "pode marcar mais de um"
    'MUNICIPIO',           -- 1 município (lista IBGE)
    'MUNICIPIO_MULTIPLO',  -- "Quais destinos?" (chips cidade, UF)
    'PAIS',                -- "Reside no exterior"
    'ESCALA_0_10',         -- NPS e nota
    'CONTADOR_POR_FAIXA',  -- nº de acompanhantes por faixa etária (+ / -)
    'MATRIZ_AVALIACAO'     -- avaliação de serviços / atrativos (Ótimo...Não utilizei)
);

CREATE TYPE tipo_item_avaliacao AS ENUM ('SERVICO', 'ATRATIVO');
CREATE TYPE conceito_avaliacao  AS ENUM ('OTIMO', 'REGULAR', 'RUIM', 'NAO_SEI', 'NAO_UTILIZEI');

CREATE TYPE origem_pesquisa     AS ENUM ('CAMPO', 'IMPORTACAO');
CREATE TYPE status_curadoria    AS ENUM ('SEM_PENDENCIA', 'EM_REVISAO', 'CONCLUIDA');

-- situação oficial de cada resposta (dashboards usam NORMAL/APROVADA/CORRIGIDA)
CREATE TYPE situacao_resposta   AS ENUM ('NORMAL', 'SUSPEITA', 'APROVADA', 'CORRIGIDA', 'EXCLUIDA');

CREATE TYPE decisao_app         AS ENUM ('CORRIGIDA_NO_APP', 'MANTIDA_E_SINALIZADA');
CREATE TYPE status_sinalizacao  AS ENUM ('PENDENTE', 'APROVADA', 'CORRIGIDA', 'EXCLUIDA');
CREATE TYPE tipo_regra          AS ENUM ('FAIXA_NUMERICA', 'CONSISTENCIA');

CREATE TYPE status_lote         AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'PARCIAL', 'FALHOU');
CREATE TYPE status_importacao   AS ENUM ('PROCESSANDO', 'CONCLUIDA', 'CONCLUIDA_COM_ERROS', 'FALHOU');
CREATE TYPE formato_exportacao  AS ENUM ('PDF', 'XLSX', 'CSV');

-- ---------------------------------------------------------------------
-- 1. TABELAS DE REFERÊNCIA (geografia, locais, empresas, itens avaliáveis)
-- ---------------------------------------------------------------------
CREATE TABLE uf (
    sigla  char(2)      PRIMARY KEY,
    nome   varchar(40)  NOT NULL UNIQUE
);

-- Lista do IBGE; também embutida no SQLite do app para uso offline
CREATE TABLE municipio (
    codigo_ibge  integer      PRIMARY KEY,              -- 7 dígitos
    nome         varchar(120) NOT NULL,
    uf_sigla     char(2)      NOT NULL REFERENCES uf(sigla)
);
CREATE INDEX ix_municipio_uf_nome ON municipio (uf_sigla, nome);

CREATE TABLE pais (
    codigo_iso  char(2)      PRIMARY KEY,
    nome        varchar(80)  NOT NULL UNIQUE
);

-- Locais onde o pesquisador aplica a pesquisa (ex.: Thermas dos Laranjais)
CREATE TABLE local_coleta (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       varchar(120) NOT NULL UNIQUE,
    ativo      boolean      NOT NULL DEFAULT true
);

-- Cadastro de empresas / estabelecimentos turísticos
CREATE TABLE estabelecimento (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cnpj           char(14) UNIQUE,
    razao_social   varchar(200),
    nome_fantasia  varchar(200) NOT NULL,
    categoria      varchar(60)  NOT NULL,   -- HOTEL, POUSADA, RESORT, PARQUE, RESTAURANTE...
    endereco       varchar(300),
    ativo          boolean      NOT NULL DEFAULT true,
    criado_em      timestamptz  NOT NULL DEFAULT now()
);

-- Serviços (Hospedagem, Alimentação...) e atrativos (Thermas, Hot Beach...)
-- avaliados na matriz Ótimo/Regular/Ruim/Não sei/Não utilizei
CREATE TABLE item_avaliacao (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo               tipo_item_avaliacao NOT NULL,
    nome               varchar(120) NOT NULL,
    estabelecimento_id bigint REFERENCES estabelecimento(id),   -- opcional
    ordem              smallint NOT NULL DEFAULT 0,
    ativo              boolean  NOT NULL DEFAULT true,
    UNIQUE (tipo, nome)
);

-- ---------------------------------------------------------------------
-- 2. USUÁRIOS E DISPOSITIVOS
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           varchar(150) NOT NULL,
    perfil         perfil_usuario NOT NULL,
    email          varchar(200) UNIQUE,         -- administrador / visualizador (web)
    senha_hash     text,                        -- idem (bcrypt/argon2)
    codigo_acesso  varchar(10)  UNIQUE,         -- pesquisador (ex.: OTO482)
    local_padrao_id bigint REFERENCES local_coleta(id),
    ativo          boolean      NOT NULL DEFAULT true,
    criado_em      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuario_credencial CHECK (
        (perfil = 'PESQUISADOR' AND codigo_acesso IS NOT NULL)
     OR (perfil <> 'PESQUISADOR' AND email IS NOT NULL AND senha_hash IS NOT NULL)
    )
);

CREATE TABLE dispositivo (
    id                uuid PRIMARY KEY,         -- gerado pelo app na 1ª execução
    usuario_id        uuid NOT NULL REFERENCES usuario(id),
    descricao         varchar(120),             -- "Tablet Samsung A8"
    plataforma        varchar(30),              -- android / ios
    versao_app        varchar(20),
    ultima_sincronizacao timestamptz,
    ativo             boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 3. FORMULÁRIOS PRÓPRIOS (RF05)
-- ---------------------------------------------------------------------
CREATE TABLE formulario (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       varchar(150) NOT NULL,           -- "Pesquisa de Demanda Turística"
    descricao  text,
    ativo      boolean NOT NULL DEFAULT true,
    criado_por uuid REFERENCES usuario(id),
    criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Cada alteração publicada gera uma nova versão; pesquisas apontam para a
-- versão usada, preservando o histórico mesmo se o formulário mudar.
CREATE TABLE formulario_versao (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    formulario_id bigint NOT NULL REFERENCES formulario(id),
    numero        integer NOT NULL,
    publicada     boolean NOT NULL DEFAULT false,
    vigente_de    date,
    vigente_ate   date,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (formulario_id, numero)
);

CREATE TABLE secao (
    id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    formulario_versao_id bigint NOT NULL REFERENCES formulario_versao(id) ON DELETE CASCADE,
    ordem                smallint NOT NULL,
    titulo               varchar(120) NOT NULL,   -- "Origem do turista"
    subtitulo            varchar(200),
    UNIQUE (formulario_versao_id, ordem)
);

CREATE TABLE pergunta (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    secao_id      bigint NOT NULL REFERENCES secao(id) ON DELETE CASCADE,
    ordem         smallint NOT NULL,
    codigo        varchar(60) NOT NULL,           -- chave estável p/ dashboards e importação
    enunciado     varchar(300) NOT NULL,
    ajuda         varchar(300),                   -- "Pode marcar mais de um"
    tipo          tipo_pergunta NOT NULL,
    obrigatoria   boolean NOT NULL DEFAULT true,
    grupo_itens   tipo_item_avaliacao,            -- só p/ MATRIZ_AVALIACAO
    config        jsonb NOT NULL DEFAULT '{}',    -- min/max, mask, tamanho máx. (ex.: 500 chars)
    UNIQUE (secao_id, ordem),
    CONSTRAINT ck_pergunta_matriz CHECK ((tipo = 'MATRIZ_AVALIACAO') = (grupo_itens IS NOT NULL))
);
CREATE INDEX ix_pergunta_codigo ON pergunta (codigo);

-- Opções de perguntas fechadas (inclui faixas etárias do contador)
CREATE TABLE opcao (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pergunta_id bigint NOT NULL REFERENCES pergunta(id) ON DELETE CASCADE,
    ordem       smallint NOT NULL,
    rotulo      varchar(150) NOT NULL,            -- "Veículo próprio", "30 a 44 anos"
    valor       varchar(60)  NOT NULL,            -- código estável: VEICULO_PROPRIO
    UNIQUE (pergunta_id, ordem),
    UNIQUE (pergunta_id, valor)
);

-- Perguntas condicionais: "Como chegou do aeroporto?" só aparece se Transporte = Aéreo
CREATE TABLE regra_exibicao (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pergunta_id        bigint NOT NULL REFERENCES pergunta(id) ON DELETE CASCADE, -- a que aparece
    pergunta_origem_id bigint NOT NULL REFERENCES pergunta(id),                   -- a que condiciona
    opcao_id           bigint REFERENCES opcao(id),                                -- opção gatilho
    valor_booleano     boolean                                                     -- ou Sim/Não gatilho
);

-- Regras de dados suspeitos (RF13): nunca bloqueiam, só sinalizam
CREATE TABLE regra_validacao (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pergunta_id bigint NOT NULL REFERENCES pergunta(id) ON DELETE CASCADE,
    tipo        tipo_regra NOT NULL,
    parametros  jsonb NOT NULL,   -- FAIXA: {"min":0,"max":120} | CONSISTENCIA: {"se_opcao":"SOZINHO","entao_soma_zero_em":[...]}
    mensagem    varchar(300) NOT NULL,           -- "500 anos parece incorreto"
    ativa       boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 4. COLETA E SINCRONIZAÇÃO (RF07, RF08, RF16)
-- ---------------------------------------------------------------------
CREATE TABLE lote_sincronizacao (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispositivo_id uuid NOT NULL REFERENCES dispositivo(id),
    usuario_id     uuid NOT NULL REFERENCES usuario(id),
    iniciado_em    timestamptz NOT NULL DEFAULT now(),
    finalizado_em  timestamptz,
    qtd_enviadas   integer NOT NULL DEFAULT 0,
    qtd_aceitas    integer NOT NULL DEFAULT 0,
    qtd_duplicadas integer NOT NULL DEFAULT 0,   -- já existiam (idempotência)
    qtd_rejeitadas integer NOT NULL DEFAULT 0,
    status         status_lote NOT NULL DEFAULT 'EM_ANDAMENTO'
);

CREATE TABLE importacao (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    uuid NOT NULL REFERENCES usuario(id),
    arquivo_nome  varchar(255) NOT NULL,
    arquivo_hash  char(64) NOT NULL UNIQUE,        -- SHA-256: impede reimportar o mesmo arquivo
    formulario_versao_id bigint NOT NULL REFERENCES formulario_versao(id),
    iniciada_em   timestamptz NOT NULL DEFAULT now(),
    finalizada_em timestamptz,
    total_linhas  integer NOT NULL DEFAULT 0,
    linhas_importadas integer NOT NULL DEFAULT 0,
    linhas_duplicadas integer NOT NULL DEFAULT 0,
    linhas_com_erro   integer NOT NULL DEFAULT 0,
    status        status_importacao NOT NULL DEFAULT 'PROCESSANDO'
);

CREATE TABLE importacao_mapeamento (            -- coluna da planilha -> pergunta
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    importacao_id  uuid NOT NULL REFERENCES importacao(id) ON DELETE CASCADE,
    coluna_planilha varchar(200) NOT NULL,
    pergunta_id    bigint NOT NULL REFERENCES pergunta(id),
    UNIQUE (importacao_id, coluna_planilha)
);

CREATE TABLE importacao_erro (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    importacao_id uuid NOT NULL REFERENCES importacao(id) ON DELETE CASCADE,
    linha         integer NOT NULL,
    coluna_planilha varchar(200),
    motivo        varchar(500) NOT NULL
);

-- Uma pesquisa = uma entrevista completa
CREATE TABLE pesquisa (
    id                   uuid PRIMARY KEY,         -- GERADO NO APP (UUID): torna o envio idempotente
    protocolo            varchar(30) NOT NULL UNIQUE, -- ex.: OTO482-0047 (RF16)
    numero_local         integer,                  -- sequencial exibido no app (#0047)
    formulario_versao_id bigint NOT NULL REFERENCES formulario_versao(id),
    origem               origem_pesquisa NOT NULL DEFAULT 'CAMPO',
    pesquisador_id       uuid REFERENCES usuario(id),     -- "quem coletou"
    dispositivo_id       uuid REFERENCES dispositivo(id),
    local_coleta_id      bigint REFERENCES local_coleta(id),
    iniciada_em          timestamptz NOT NULL,     -- horário do aparelho (ex.: 10:34)
    finalizada_em        timestamptz NOT NULL,     -- ex.: 10:42
    recebida_em          timestamptz NOT NULL DEFAULT now(), -- quando chegou ao servidor
    lote_sincronizacao_id uuid REFERENCES lote_sincronizacao(id),
    importacao_id        uuid REFERENCES importacao(id),
    id_externo           varchar(100),             -- id/linha na planilha histórica
    hash_dedup           char(64),                 -- hash do conteúdo p/ detectar duplicatas importadas
    status_curadoria     status_curadoria NOT NULL DEFAULT 'SEM_PENDENCIA',
    UNIQUE (pesquisador_id, numero_local),
    CONSTRAINT ck_pesquisa_origem CHECK (
        (origem = 'CAMPO'      AND pesquisador_id IS NOT NULL AND dispositivo_id IS NOT NULL)
     OR (origem = 'IMPORTACAO' AND importacao_id IS NOT NULL)
    ),
    CONSTRAINT ck_pesquisa_datas CHECK (finalizada_em >= iniciada_em)
);
CREATE INDEX ix_pesquisa_periodo   ON pesquisa (iniciada_em);
CREATE INDEX ix_pesquisa_curadoria ON pesquisa (status_curadoria) WHERE status_curadoria <> 'SEM_PENDENCIA';
CREATE UNIQUE INDEX ux_pesquisa_dedup ON pesquisa (importacao_id, hash_dedup) WHERE hash_dedup IS NOT NULL;

-- Uma linha por (pesquisa, pergunta)
CREATE TABLE resposta (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pesquisa_id uuid   NOT NULL REFERENCES pesquisa(id) ON DELETE CASCADE,
    pergunta_id bigint NOT NULL REFERENCES pergunta(id),
    situacao    situacao_resposta NOT NULL DEFAULT 'NORMAL',
    UNIQUE (pesquisa_id, pergunta_id)
);
CREATE INDEX ix_resposta_pergunta ON resposta (pergunta_id, situacao);

-- Valores da resposta (1 para perguntas simples; N para múltipla escolha, destinos,
-- contador por faixa etária: opcao_id = faixa + valor_numero = quantidade)
CREATE TABLE resposta_valor (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resposta_id   bigint NOT NULL REFERENCES resposta(id) ON DELETE CASCADE,
    opcao_id      bigint REFERENCES opcao(id),
    municipio_ibge integer REFERENCES municipio(codigo_ibge),
    pais_iso      char(2) REFERENCES pais(codigo_iso),
    valor_numero  numeric(14,2),
    valor_data    date,
    valor_booleano boolean,
    valor_texto   varchar(500),
    CONSTRAINT ck_valor_preenchido CHECK (
        num_nonnulls(opcao_id, municipio_ibge, pais_iso, valor_numero,
                     valor_data, valor_booleano, valor_texto) >= 1)
);
CREATE INDEX ix_resp_valor_resposta  ON resposta_valor (resposta_id);
CREATE INDEX ix_resp_valor_opcao     ON resposta_valor (opcao_id)      WHERE opcao_id IS NOT NULL;
CREATE INDEX ix_resp_valor_municipio ON resposta_valor (municipio_ibge) WHERE municipio_ibge IS NOT NULL;

-- Matrizes de avaliação (serviços e atrativos)
CREATE TABLE avaliacao_item (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resposta_id       bigint NOT NULL REFERENCES resposta(id) ON DELETE CASCADE,
    item_avaliacao_id bigint NOT NULL REFERENCES item_avaliacao(id),
    conceito          conceito_avaliacao NOT NULL,
    UNIQUE (resposta_id, item_avaliacao_id)
);
CREATE INDEX ix_avaliacao_item ON avaliacao_item (item_avaliacao_id, conceito);

-- ---------------------------------------------------------------------
-- 5. CURADORIA DE RESPOSTAS SUSPEITAS (RF13, RF19)
-- ---------------------------------------------------------------------
CREATE TABLE sinalizacao (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resposta_id      bigint NOT NULL REFERENCES resposta(id) ON DELETE CASCADE,
    regra_validacao_id bigint REFERENCES regra_validacao(id),
    motivo           varchar(300) NOT NULL,        -- "Idade fora do esperado"
    valor_original   jsonb NOT NULL,               -- foto do valor no momento da sinalização
    decisao_no_app   decisao_app,                  -- Corrigir / Manter e sinalizar
    status           status_sinalizacao NOT NULL DEFAULT 'PENDENTE',
    criada_em        timestamptz NOT NULL DEFAULT now(),
    curador_id       uuid REFERENCES usuario(id),
    curada_em        timestamptz,
    justificativa    varchar(500),
    valor_corrigido  jsonb,                        -- quando status = CORRIGIDA
    CONSTRAINT ck_sinalizacao_curada CHECK (
        status = 'PENDENTE' OR (curador_id IS NOT NULL AND curada_em IS NOT NULL))
);
CREATE INDEX ix_sinalizacao_pendente ON sinalizacao (criada_em) WHERE status = 'PENDENTE';

-- ---------------------------------------------------------------------
-- 6. INDICADORES, DASHBOARDS E EXPORTAÇÃO (RF14)
-- ---------------------------------------------------------------------
CREATE TABLE indicador (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo      varchar(60) NOT NULL UNIQUE,       -- NPS, TAXA_OCUPACAO, PERNOITES_MEDIOS...
    nome        varchar(150) NOT NULL,
    descricao   text,
    definicao   jsonb NOT NULL,                    -- pergunta(s), agregação, filtros
    ativo       boolean NOT NULL DEFAULT true
);

CREATE TABLE indicador_valor (                     -- cache dos indicadores calculados
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    indicador_id  bigint NOT NULL REFERENCES indicador(id) ON DELETE CASCADE,
    periodo_inicio date NOT NULL,
    periodo_fim    date NOT NULL,
    dimensoes     jsonb NOT NULL DEFAULT '{}',     -- {"local":"Thermas","uf":"SP"}
    valor         numeric(18,4) NOT NULL,
    amostra       integer NOT NULL,                -- nº de pesquisas consideradas
    calculado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_indicador_valor ON indicador_valor (indicador_id, periodo_inicio, periodo_fim);

CREATE TABLE dashboard (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       varchar(150) NOT NULL,
    descricao  text,
    dono_id    uuid NOT NULL REFERENCES usuario(id),
    consolidado boolean NOT NULL DEFAULT false,    -- true = padrão do sistema; false = personalizado
    compartilhado boolean NOT NULL DEFAULT false,
    filtros_padrao jsonb NOT NULL DEFAULT '{}',
    criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dashboard_widget (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dashboard_id bigint NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    indicador_id bigint REFERENCES indicador(id),
    pergunta_id  bigint REFERENCES pergunta(id),
    tipo_grafico varchar(30) NOT NULL,             -- barra, linha, pizza, mapa, kpi
    titulo       varchar(150) NOT NULL,
    posicao      jsonb NOT NULL DEFAULT '{}',      -- {"x":0,"y":0,"w":6,"h":4}
    config       jsonb NOT NULL DEFAULT '{}',
    CONSTRAINT ck_widget_fonte CHECK (num_nonnulls(indicador_id, pergunta_id) = 1)
);

CREATE TABLE exportacao (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  uuid NOT NULL REFERENCES usuario(id),
    dashboard_id bigint REFERENCES dashboard(id),
    formato     formato_exportacao NOT NULL,
    filtros     jsonb NOT NULL DEFAULT '{}',
    criada_em   timestamptz NOT NULL DEFAULT now(),
    arquivo_ref varchar(500)
);

-- ---------------------------------------------------------------------
-- 7. AUDITORIA (RF15)
-- ---------------------------------------------------------------------
CREATE TABLE log_auditoria (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ocorrido_em    timestamptz NOT NULL DEFAULT now(),
    usuario_id     uuid,                           -- quem fez (sem FK: log nunca bloqueia nem some)
    dispositivo_id uuid,
    acao           varchar(10) NOT NULL,           -- INSERT / UPDATE / DELETE
    entidade       varchar(60) NOT NULL,           -- nome da tabela
    entidade_id    varchar(60) NOT NULL,
    dados_antes    jsonb,
    dados_depois   jsonb,
    ip             inet
);
CREATE INDEX ix_auditoria_entidade ON log_auditoria (entidade, entidade_id, ocorrido_em);
CREATE INDEX ix_auditoria_usuario  ON log_auditoria (usuario_id, ocorrido_em);

-- O backend deve executar, no início de cada transação:
--   SELECT set_config('app.usuario_id', '<uuid>', true);
--   SELECT set_config('app.dispositivo_id', '<uuid>', true);  -- opcional
CREATE OR REPLACE FUNCTION fn_auditar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = oto, pg_catalog AS $$
DECLARE
    v_id text;
BEGIN
    v_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id',
                     to_jsonb(NEW)->>'codigo_ibge', to_jsonb(OLD)->>'codigo_ibge');
    INSERT INTO log_auditoria (usuario_id, dispositivo_id, acao, entidade, entidade_id,
                               dados_antes, dados_depois)
    VALUES (
        NULLIF(current_setting('app.usuario_id', true), '')::uuid,
        NULLIF(current_setting('app.dispositivo_id', true), '')::uuid,
        TG_OP, TG_TABLE_NAME, v_id,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) - 'senha_hash' END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) - 'senha_hash' END
    );
    RETURN COALESCE(NEW, OLD);
END $$;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'usuario','dispositivo','estabelecimento','item_avaliacao','local_coleta',
        'formulario','formulario_versao','secao','pergunta','opcao','regra_validacao',
        'pesquisa','sinalizacao',
        'importacao','indicador','dashboard','dashboard_widget']
    LOOP
        EXECUTE format(
          'CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON %I
           FOR EACH ROW EXECUTE FUNCTION fn_auditar()', t);
    END LOOP;
END $$;

-- Tabelas de alto volume: só UPDATE/DELETE (o INSERT já fica rastreado em pesquisa)
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['resposta','resposta_valor','avaliacao_item']
    LOOP
        EXECUTE format(
          'CREATE TRIGGER trg_auditoria AFTER UPDATE OR DELETE ON %I
           FOR EACH ROW EXECUTE FUNCTION fn_auditar()', t);
    END LOOP;
END $$;

-- Log imutável: ninguém altera nem apaga
CREATE OR REPLACE FUNCTION fn_log_imutavel() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'log_auditoria é imutável'; END $$;
CREATE TRIGGER trg_log_imutavel BEFORE UPDATE OR DELETE ON log_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_log_imutavel();

-- ---------------------------------------------------------------------
-- 8. VIEWS PARA DASHBOARDS
-- ---------------------------------------------------------------------
-- Respostas "aproveitáveis": exclui suspeitas pendentes e excluídas
CREATE VIEW vw_resposta_valida AS
SELECT r.id AS resposta_id, r.pesquisa_id, r.pergunta_id, p.codigo AS pergunta_codigo
FROM resposta r
JOIN pergunta p ON p.id = r.pergunta_id
WHERE r.situacao IN ('NORMAL', 'APROVADA', 'CORRIGIDA');

-- Fila de curadoria do gestor
CREATE VIEW vw_fila_curadoria AS
SELECT s.id AS sinalizacao_id, s.criada_em, s.motivo, s.valor_original, s.decisao_no_app,
       ps.protocolo, ps.iniciada_em, u.nome AS pesquisador, lc.nome AS local_coleta,
       pg.enunciado AS pergunta
FROM sinalizacao s
JOIN resposta  r  ON r.id  = s.resposta_id
JOIN pergunta  pg ON pg.id = r.pergunta_id
JOIN pesquisa  ps ON ps.id = r.pesquisa_id
LEFT JOIN usuario u ON u.id = ps.pesquisador_id
LEFT JOIN local_coleta lc ON lc.id = ps.local_coleta_id
WHERE s.status = 'PENDENTE'
ORDER BY s.criada_em;
