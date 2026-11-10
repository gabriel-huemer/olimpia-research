#!/usr/bin/env bash
# Executado pela imagem oficial do PostgreSQL apenas na PRIMEIRA criação do volume.
export PGUSER="$POSTGRES_USER" PGDATABASE="$POSTGRES_DB"
unset PGHOST PGPORT
bash /oto/scripts/bootstrap.sh
