#!/usr/bin/env bash
# Prepara o banco do OTO do zero ou atualiza um existente. É IDEMPOTENTE.
#   1) papéis de acesso (db/roles.sql)   2) migrações pendentes   3) seeds   4) administrador inicial
#
# Conexão: variáveis padrão do libpq (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD).
# Obrigatórias: OTO_WEB_PASSWORD, OTO_MOBILE_PASSWORD, OTO_READONLY_PASSWORD
# Opcionais:    OTO_APP_ADMIN_EMAIL, OTO_APP_ADMIN_PASSWORD, OTO_APP_ADMIN_NAME
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
PSQL=(psql -X -v ON_ERROR_STOP=1 -q)

for v in OTO_WEB_PASSWORD OTO_MOBILE_PASSWORD OTO_READONLY_PASSWORD; do
  [ -n "${!v:-}" ] || { echo "ERRO: defina $v (veja .env.example)" >&2; exit 1; }
done

echo "==> 1/4 Papéis de acesso"
"${PSQL[@]}" -f "$ROOT/db/roles.sql"

echo "==> 2/4 Migrações"
"${PSQL[@]}" <<'SQL'
CREATE SCHEMA IF NOT EXISTS oto;
CREATE TABLE IF NOT EXISTS oto.schema_migrations (
    versao      text PRIMARY KEY,
    aplicada_em timestamptz NOT NULL DEFAULT now(),
    checksum    text NOT NULL
);
SQL
shopt -s nullglob
for f in "$ROOT"/db/migrations/V*.sql; do
  versao="$(basename "$f" .sql)"
  sum="$(sha256sum "$f" | cut -d' ' -f1)"
  atual="$("${PSQL[@]}" -At -c "SELECT checksum FROM oto.schema_migrations WHERE versao = '$versao'")"
  if [ -z "$atual" ]; then
    echo "    aplicando $versao"
    "${PSQL[@]}" -1 -f "$f"
    "${PSQL[@]}" -c "INSERT INTO oto.schema_migrations (versao, checksum) VALUES ('$versao', '$sum')"
  elif [ "$atual" != "$sum" ]; then
    echo "ERRO: $versao já foi aplicada, mas o arquivo mudou. Não edite migrações antigas: crie uma nova (V00N__...)." >&2
    exit 1
  else
    echo "    ok       $versao"
  fi
done

echo "==> 3/4 Dados de referência"
for f in "$ROOT"/db/seeds/S*.sql; do
  echo "    $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
[ -e "$ROOT/db/seeds/S03_municipios.sql" ] || \
  echo "    AVISO: municípios ainda não carregados -> python3 scripts/carregar_municipios_ibge.py && ./scripts/bootstrap.sh"

echo "==> 4/4 Administrador inicial"
if [ -n "${OTO_APP_ADMIN_EMAIL:-}" ] && [ -n "${OTO_APP_ADMIN_PASSWORD:-}" ]; then
  export OTO_APP_ADMIN_NAME="${OTO_APP_ADMIN_NAME:-Administrador OTO}"
  "${PSQL[@]}" <<'SQL'
\getenv adm_email OTO_APP_ADMIN_EMAIL
\getenv adm_senha OTO_APP_ADMIN_PASSWORD
\getenv adm_nome  OTO_APP_ADMIN_NAME
INSERT INTO oto.usuario (nome, perfil, email, senha_hash)
VALUES (:'adm_nome', 'ADMINISTRADOR', :'adm_email', public.crypt(:'adm_senha', public.gen_salt('bf', 12)))
ON CONFLICT (email) DO NOTHING;
SQL
  echo "    administrador garantido: $OTO_APP_ADMIN_EMAIL (hash bcrypt \$2a\$)"
else
  echo "    pulado (OTO_APP_ADMIN_EMAIL / OTO_APP_ADMIN_PASSWORD não definidos)"
fi
echo "Pronto."
