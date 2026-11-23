#!/usr/bin/env bash
# Restaura um backup em um banco NOVO (nunca por cima do banco em uso).
#   ./scripts/restore.sh backups/oto_20261109_021500.dump oto_restaurado
set -euo pipefail
ARQ="${1:?uso: restore.sh <arquivo.dump> <nome_do_novo_banco>}"; NOVO="${2:?informe o nome do novo banco}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Lê só o que precisa do .env, sem executar o arquivo (valores com espaço quebrariam).
do_env() { [[ -f "$ROOT/.env" ]] && sed -n "s/^$1=//p" "$ROOT/.env" | tail -1 || true; }
OTO_DB_ADMIN_USER="${OTO_DB_ADMIN_USER:-$(do_env OTO_DB_ADMIN_USER)}"
USR="${OTO_DB_ADMIN_USER:-oto_admin}"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx oto-db; then
  docker exec oto-db createdb -U "$USR" "$NOVO"
  docker exec -i oto-db pg_restore -U "$USR" -d "$NOVO" --no-owner --role="$USR" < "$ARQ"
else
  createdb -U "$USR" "$NOVO"; pg_restore -U "$USR" -d "$NOVO" --no-owner --role="$USR" "$ARQ"
fi
echo "Restaurado em '$NOVO'. Confira os dados antes de apontar a aplicação para ele."
