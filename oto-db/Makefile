# Atalhos (precisam de .env preenchido)
include .env
export

up:        ; docker compose up -d
down:      ; docker compose down
logs:      ; docker compose logs -f db
psql:      ; docker exec -it oto-db psql -U $(OTO_DB_ADMIN_USER) -d $(OTO_DB_NAME)
backup:    ; ./scripts/backup.sh
municipios:; python3 scripts/carregar_municipios_ibge.py
# Aplica migrações/seeds novos num banco que já existe (o init do Docker só roda na 1ª vez)
migrate:   ; docker exec -e OTO_WEB_PASSWORD -e OTO_MOBILE_PASSWORD -e OTO_READONLY_PASSWORD \
             -e OTO_APP_ADMIN_EMAIL -e OTO_APP_ADMIN_PASSWORD -e OTO_APP_ADMIN_NAME \
             -e PGUSER=$(OTO_DB_ADMIN_USER) -e PGDATABASE=$(OTO_DB_NAME) oto-db bash /oto/scripts/bootstrap.sh
test:      ; docker exec -i oto-db psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -U $(OTO_DB_ADMIN_USER) -d $(OTO_DB_NAME) < tests/smoke_test.sql
.PHONY: up down logs psql backup municipios migrate test
