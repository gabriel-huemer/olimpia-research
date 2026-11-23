#!/usr/bin/env bash
# Cria (ou recria a senha de) 3 contas de TESTE do painel web, uma de cada perfil padrão:
#   admin.teste@oto.local (ADMINISTRADOR), visualizador.teste@oto.local (VISUALIZADOR; não deve conseguir entrar),
#   pesquisador.teste@oto.local (PESQUISADOR, código OTO900; não deve conseguir entrar no painel).
# NÃO use em produção.
#
# Conexão: variáveis padrão do libpq (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD), como o bootstrap.sh.
# Senhas: usa TEST_ADMIN_SENHA / TEST_VIS_SENHA / TEST_PESQ_SENHA se definidas; senão gera senhas aleatórias.
# Saída (stdout): linhas KEY=VALUE com e-mails e senhas, prontas para `set -a; . arquivo` ou $GITHUB_ENV.
#   Ex. local:  docker exec -e PGUSER=oto_admin -e PGDATABASE=oto oto-db \
#                 bash /oto/scripts/criar_usuarios_teste.sh > .usuarios-teste.env && chmod 600 .usuarios-teste.env
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"

gerar() { head -c 18 /dev/urandom | od -An -vtx1 | tr -d ' \n'; printf 'A9'; }  # hex: nunca tem quebra de linha
export TEST_ADMIN_EMAIL="${TEST_ADMIN_EMAIL:-admin.teste@oto.local}"
export TEST_VIS_EMAIL="${TEST_VIS_EMAIL:-visualizador.teste@oto.local}"
export TEST_PESQ_EMAIL="${TEST_PESQ_EMAIL:-pesquisador.teste@oto.local}"
export TEST_ADMIN_SENHA="${TEST_ADMIN_SENHA:-$(gerar)}"
export TEST_VIS_SENHA="${TEST_VIS_SENHA:-$(gerar)}"
export TEST_PESQ_SENHA="${TEST_PESQ_SENHA:-$(gerar)}"

psql -X -v ON_ERROR_STOP=1 -q <<'SQL' >&2
\getenv adm_email  TEST_ADMIN_EMAIL
\getenv adm_senha  TEST_ADMIN_SENHA
\getenv vis_email  TEST_VIS_EMAIL
\getenv vis_senha  TEST_VIS_SENHA
\getenv pesq_email TEST_PESQ_EMAIL
\getenv pesq_senha TEST_PESQ_SENHA
SET search_path = oto, public;
INSERT INTO usuario (nome, perfil, email, senha_hash, codigo_acesso, perfil_acesso_id, ativo) VALUES
  ('Admin de Teste',        'ADMINISTRADOR', :'adm_email',  public.crypt(:'adm_senha',  public.gen_salt('bf', 12)), NULL,     1, true),
  ('Visualizador de Teste', 'VISUALIZADOR',  :'vis_email',  public.crypt(:'vis_senha',  public.gen_salt('bf', 12)), NULL,     3, true),
  ('Pesquisador de Teste',  'PESQUISADOR',   :'pesq_email', public.crypt(:'pesq_senha', public.gen_salt('bf', 12)), 'OTO900', 2, true)
ON CONFLICT (email) DO UPDATE
   SET senha_hash = EXCLUDED.senha_hash, perfil = EXCLUDED.perfil,
       perfil_acesso_id = EXCLUDED.perfil_acesso_id, ativo = true;
SQL
echo "contas de teste prontas em ${PGDATABASE:-?}" >&2

for k in TEST_ADMIN_EMAIL TEST_ADMIN_SENHA TEST_VIS_EMAIL TEST_VIS_SENHA TEST_PESQ_EMAIL TEST_PESQ_SENHA; do
  printf '%s=%s\n' "$k" "${!k}"
done
