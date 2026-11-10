#!/usr/bin/env bash
# Restaura um backup em um banco NOVO (nunca por cima do banco em uso).
#   ./scripts/restore.sh backups/oto_20261109_021500.dump oto_restaurado
set -euo pipefail
ARQ="${1:?uso: restore.sh <arquivo.dump> <nome_do_novo_banco>}"; NOVO="${2:?informe o nome do novo banco}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$ROOT/.env" ] && { set -a; . "$ROOT/.env"; set +a; }
USR="${OTO_DB_ADMIN_USER:-oto_admin}"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx oto-db; then
  docker exec oto-db createdb -U "$USR" "$NOVO"
  docker exec -i oto-db pg_restore -U "$USR" -d "$NOVO" --no-owner --role="$USR" < "$ARQ"
else
  createdb -U "$USR" "$NOVO"; pg_restore -U "$USR" -d "$NOVO" --no-owner --role="$USR" "$ARQ"
fi
echo "Restaurado em '$NOVO'. Confira os dados antes de apontar a aplicação para ele."
