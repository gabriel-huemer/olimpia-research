#!/usr/bin/env bash
# Backup lógico compactado (formato custom do pg_dump) com retenção.
#   ./scripts/backup.sh                 # usa o container "oto-db" se existir, senão o psql local
# Variáveis: BACKUP_DIR (padrão ./backups), RETENCAO_DIAS (padrão 14), OTO_DB_NAME, OTO_DB_ADMIN_USER
# Agende no cron do servidor, por ex. todo dia às 02:30:
#   30 2 * * * cd /caminho/oto-db && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$ROOT/.env" ] && { set -a; . "$ROOT/.env"; set +a; }
DB="${OTO_DB_NAME:-oto}"; USR="${OTO_DB_ADMIN_USER:-oto_admin}"
DIR="${BACKUP_DIR:-$ROOT/backups}"; DIAS="${RETENCAO_DIAS:-14}"
mkdir -p "$DIR"
ARQ="$DIR/oto_$(date +%Y%m%d_%H%M%S).dump"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx oto-db; then
  docker exec oto-db pg_dump -U "$USR" -d "$DB" -Fc --no-owner > "$ARQ"
else
  pg_dump -Fc --no-owner "${DATABASE_URL:-dbname=$DB user=$USR}" > "$ARQ"
fi

# valida que o arquivo é um dump legível
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx oto-db; then
  docker exec -i oto-db pg_restore -l < "$ARQ" > /dev/null
else
  pg_restore -l "$ARQ" > /dev/null
fi
find "$DIR" -name 'oto_*.dump' -mtime +"$DIAS" -delete
echo "OK $(date -Is) $ARQ ($(du -h "$ARQ" | cut -f1))"
