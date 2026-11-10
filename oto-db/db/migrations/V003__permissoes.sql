-- V003 - Permissões por perfil de acesso (princípio do menor privilégio)
--
--   oto_web      back-end do painel Web (gestores/administradores)
--   oto_mobile   API de sincronização do app do pesquisador
--   oto_readonly BI / dashboards externos / consultas de leitura
--
-- Os papéis são criados por db/roles.sql (antes das migrações), pois as senhas vêm do ambiente.
SET search_path = oto, public;

GRANT USAGE ON SCHEMA oto TO oto_web, oto_mobile, oto_readonly;

-- ---------------------------------------------------------------- WEB
GRANT SELECT ON ALL TABLES IN SCHEMA oto TO oto_web;          -- inclui log_auditoria (consulta)
GRANT SELECT ON vw_resposta_valida, vw_fila_curadoria TO oto_web;

GRANT INSERT, UPDATE ON
    uf, municipio, pais, local_coleta, estabelecimento, item_avaliacao,
    usuario, dispositivo,
    formulario, formulario_versao, secao, pergunta, opcao, regra_exibicao, regra_validacao,
    importacao, importacao_mapeamento, importacao_erro,
    pesquisa, resposta, resposta_valor, avaliacao_item,   -- importação de planilhas e curadoria
    sinalizacao,
    indicador, indicador_valor, dashboard, dashboard_widget, exportacao
TO oto_web;

-- Exclusão física só onde faz sentido (rascunho de formulário e dashboards).
-- Pesquisas e respostas NUNCA são apagadas: a exclusão é lógica (situacao = 'EXCLUIDA').
GRANT DELETE ON
    secao, pergunta, opcao, regra_exibicao, regra_validacao,
    dashboard, dashboard_widget, exportacao, indicador_valor, importacao_mapeamento
TO oto_web;

-- ---------------------------------------------------------------- MOBILE
-- Lê a estrutura do formulário e as listas de apoio para o SQLite offline
GRANT SELECT ON
    uf, municipio, pais, local_coleta, item_avaliacao,
    formulario, formulario_versao, secao, pergunta, opcao, regra_exibicao, regra_validacao
TO oto_mobile;

-- Login do pesquisador por código: sem acesso a senha_hash nem e-mail
GRANT SELECT (id, nome, perfil, codigo_acesso, ativo, local_padrao_id) ON usuario TO oto_mobile;

-- Envia as coletas (somente inclusão; depois de enviada, a pesquisa é imutável para o app)
GRANT SELECT, INSERT ON pesquisa, resposta, resposta_valor, avaliacao_item, sinalizacao TO oto_mobile;
GRANT SELECT, INSERT, UPDATE ON lote_sincronizacao TO oto_mobile;
GRANT SELECT, INSERT ON dispositivo TO oto_mobile;
GRANT UPDATE (versao_app, ultima_sincronizacao, descricao) ON dispositivo TO oto_mobile;

-- ---------------------------------------------------------------- READONLY (BI)
GRANT SELECT ON
    uf, municipio, pais, local_coleta, estabelecimento, item_avaliacao,
    dispositivo,
    formulario, formulario_versao, secao, pergunta, opcao, regra_exibicao, regra_validacao,
    lote_sincronizacao, importacao,
    pesquisa, resposta, resposta_valor, avaliacao_item, sinalizacao,
    indicador, indicador_valor, dashboard, dashboard_widget,
    vw_resposta_valida, vw_fila_curadoria
TO oto_readonly;
GRANT SELECT (id, nome, perfil, ativo, local_padrao_id, criado_em) ON usuario TO oto_readonly;
-- log_auditoria, senhas e códigos de acesso: sem acesso
