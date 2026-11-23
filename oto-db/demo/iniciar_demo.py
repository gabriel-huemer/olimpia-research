#!/usr/bin/env python3
"""Prepara e abre a demonstração nesta máquina: banco oto_demo, 700 pesquisas fictícias e painel.

    python3 demo/iniciar_demo.py [--porta 3000]        (ou: make demo)

Pré-requisitos: Docker, Node 20+ e Python 3.9+. Pode rodar de novo: só faz o que falta e não apaga nada.
As senhas são geradas aqui e ficam em arquivos fora do Git. Nunca usa o banco real (oto).
"""
import argparse
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

DB = Path(__file__).resolve().parents[1]
PAINEL = DB.parent / "dashboard"
ENV_DB = DB / ".env"
ENV_PAINEL = PAINEL / ".env.demo.local"
CONTAS = DB / ".usuarios-teste.oto_demo.env"
MUNICIPIOS = DB / "db/seeds/S03_municipios.sql"
CONTAINER = os.environ.get("OTO_DB_CONTAINER", "oto-db")
BANCO = "oto_demo"
TOTAL = 700


def passo(texto):
    print(f"==> {texto}", flush=True)


def programa(nome):
    caminho = shutil.which(nome)
    if not caminho:
        raise SystemExit(f"Não encontrei '{nome}'. Instale e rode de novo.")
    return caminho


def rodar(*cmd, cwd=DB, env=None):
    try:
        subprocess.run(cmd, cwd=cwd, env=env, check=True)
    except subprocess.CalledProcessError:
        raise SystemExit(f"Falhou: {' '.join(map(str, cmd[:4]))} (veja a mensagem acima).") from None


def ler_env(arquivo):
    valores = {}
    for linha in arquivo.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.lstrip().startswith("#"):
            chave, valor = linha.split("=", 1)
            valores[chave.strip()] = valor.strip().strip("\"'")
    return valores


def gravar(arquivo, texto):
    """Arquivo com senhas: só o dono lê."""
    with os.fdopen(os.open(arquivo, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)


def porta_livre(porta):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", porta)) != 0


def env_do_banco(docker):
    if not ENV_DB.exists():
        # Banco criado antes com outras senhas: gerar novas aqui impediria a conexão.
        volume = subprocess.run([docker, "volume", "ls", "-q", "--filter", "label=com.docker.compose.volume=oto_pgdata",
                                 "--filter", f"label=com.docker.compose.project={os.environ.get('COMPOSE_PROJECT_NAME', 'oto-db')}"],
                                capture_output=True, text=True, check=True)
        if volume.stdout.strip():
            raise SystemExit("Já existe um banco do OTO nesta máquina, mas falta o oto-db/.env com as senhas dele.\n"
                             "Copie o .env da pasta onde ele foi criado e rode de novo.")
        porta = next((p for p in (5432, *range(5433, 5460)) if porta_livre(p)), None)
        if porta is None:
            raise SystemExit("Nenhuma porta livre entre 5432 e 5459 para o banco.")
        senha = lambda: secrets.token_hex(24)
        gravar(ENV_DB, f"OTO_DB_NAME=oto\nOTO_DB_PORT={porta}\nOTO_DB_ADMIN_USER=oto_admin\n"
                       f"OTO_DB_ADMIN_PASSWORD={senha()}\nOTO_WEB_PASSWORD={senha()}\n"
                       f"OTO_MOBILE_PASSWORD={senha()}\nOTO_READONLY_PASSWORD={senha()}\n")
        print("    oto-db/.env criado com senhas novas")
    cfg = ler_env(ENV_DB)
    faltam = [k for k in ("OTO_DB_ADMIN_PASSWORD", "OTO_WEB_PASSWORD", "OTO_MOBILE_PASSWORD", "OTO_READONLY_PASSWORD") if not cfg.get(k)]
    if faltam:
        raise SystemExit(f"Preencha no oto-db/.env: {', '.join(faltam)}")
    return cfg


def env_do_painel(cfg):
    if not ENV_PAINEL.exists():
        gravar(ENV_PAINEL, f"OTO_DB_HOST=127.0.0.1\nOTO_DB_PORT={cfg.get('OTO_DB_PORT') or 5432}\nOTO_DB_NAME={BANCO}\n"
                           f"OTO_DB_USER=oto_web\nOTO_DB_PASSWORD={cfg['OTO_WEB_PASSWORD']}\n"
                           f"OTO_MOBILE_PASSWORD={cfg['OTO_MOBILE_PASSWORD']}\nAUTH_SECRET={secrets.token_hex(32)}\n"
                           f"SYNC_API_TOKEN={secrets.token_hex(24)}\nOTO_DADOS_FICTICIOS=1\n")
        print("    dashboard/.env.demo.local criado")
    painel = ler_env(ENV_PAINEL)
    # Trava: pesquisas fictícias nunca podem ir para outro banco.
    urls = [u for u in (painel.get("DATABASE_URL"), painel.get("OTO_MOBILE_DATABASE_URL")) if u]
    if painel.get("OTO_DB_NAME") != BANCO or any(urlsplit(u).path != f"/{BANCO}" for u in urls):
        raise SystemExit(f"dashboard/.env.demo.local não aponta só para {BANCO}. Corrija ou apague o arquivo e rode de novo.")
    # Vazio vence o que estiver em .env.local (que pode ser de outro banco).
    return {**os.environ, "DATABASE_URL": "", "OTO_MOBILE_DATABASE_URL": "", **painel, "OTO_DADOS_FICTICIOS": "1"}


def esperar(condicao, segundos, erro):
    fim = time.time() + segundos
    while time.time() < fim:
        if condicao():
            return
        time.sleep(1)
    raise SystemExit(erro)


def responde(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return json.load(r)
    except (urllib.error.URLError, OSError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description="Prepara e abre a demonstração do OTO nesta máquina.")
    ap.add_argument("--porta", type=int, default=3000, help="porta do painel (padrão 3000)")
    porta = ap.parse_args().porta
    if not 1 <= porta <= 65535:
        raise SystemExit("--porta deve estar entre 1 e 65535")
    docker, node, npm = programa("docker"), programa("node"), programa("npm")
    versao = subprocess.run([node, "--version"], capture_output=True, text=True, check=True).stdout.strip()
    if int(re.match(r"v(\d+)", versao).group(1)) < 20:
        raise SystemExit(f"O painel precisa do Node 20 ou mais novo (aqui: {versao}).")
    if subprocess.run([docker, "info"], capture_output=True).returncode:
        raise SystemExit("O Docker não está rodando (ou seu usuário não tem acesso a ele).")
    if not porta_livre(porta):
        raise SystemExit(f"A porta {porta} está em uso. Feche o programa ou use --porta 3001.")

    passo("1/5 Configuração")
    cfg = env_do_banco(docker)
    env = env_do_painel(cfg)
    admin = cfg.get("OTO_DB_ADMIN_USER") or "oto_admin"
    if not MUNICIPIOS.exists():
        rodar(sys.executable, "scripts/carregar_municipios_ibge.py")

    passo("2/5 Banco de dados")
    rodar(docker, "compose", "up", "-d", "db")
    no_banco = lambda *a: [docker, "exec", "-e", f"PGUSER={admin}", "-e", f"PGDATABASE={BANCO}", CONTAINER, *a]
    # Por TCP: durante a criação inicial o PostgreSQL só atende pelo socket.
    pronto = lambda: subprocess.run([docker, "exec", CONTAINER, "pg_isready", "-q", "-h", "127.0.0.1"], capture_output=True).returncode == 0
    esperar(pronto, 180, f"O banco não subiu. Veja: docker logs {CONTAINER}")

    def sql(texto, banco=BANCO):
        r = subprocess.run([docker, "exec", CONTAINER, "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-U", admin, "-d", banco, "-c", texto],
                           capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f"Erro no banco: {r.stderr.strip()}")
        return r.stdout.strip()

    if not sql(f"select 1 from pg_database where datname = '{BANCO}'", "postgres"):
        sql(f"create database {BANCO}", "postgres")
    rodar(*no_banco("bash", "/oto/scripts/bootstrap.sh"))
    if not CONTAS.exists():
        r = subprocess.run(no_banco("bash", "/oto/scripts/criar_usuarios_teste.sh"), capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f"Não foi possível criar as contas de teste: {r.stderr.strip()}")
        gravar(CONTAS, r.stdout)

    passo("3/5 Painel (na primeira vez demora alguns minutos)")
    if not (PAINEL / "node_modules").exists():
        rodar(npm, "ci", "--no-audit", "--no-fund", cwd=PAINEL)
    rodar(npm, "run", "build", cwd=PAINEL, env=env)

    passo("4/5 Abrindo o painel")
    base = f"http://127.0.0.1:{porta}"
    servidor = subprocess.Popen([node, str(PAINEL / "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", str(porta)],
                                cwd=PAINEL, env=env)
    try:
        esperar(lambda: servidor.poll() is not None or responde(f"{base}/api/analytics"), 60, "O painel não respondeu.")
        if servidor.poll() is not None:
            raise SystemExit("O painel fechou sozinho (veja a mensagem acima).")

        passo("5/5 Pesquisas fictícias")
        existentes = int(sql("select count(*) from oto.pesquisa"))
        if existentes == 0:
            rodar(sys.executable, "demo/popular_demo.py", "--porta", str(porta), "--total", str(TOTAL), env=env)
            existentes = int(sql("select count(*) from oto.pesquisa"))
        if existentes < TOTAL:
            print(f"    ATENÇÃO: o banco tem {existentes} pesquisas, e o esperado são {TOTAL}. Para recomeçar, veja demo/README.md.")
        print(f"\nPronto: {base.replace('127.0.0.1', 'localhost')}  ({existentes} pesquisas)")
        print(f"Equipe:  /administracao  (e-mail e senha em oto-db/{CONTAS.name})")
        print("Para encerrar o painel: Ctrl+C. Para abrir de novo, rode o mesmo comando.\n", flush=True)
        servidor.wait()
    except KeyboardInterrupt:
        print("\nPainel encerrado. O banco continua no Docker (make down encerra).")
    finally:
        servidor.terminate()
        servidor.wait()


if __name__ == "__main__":
    main()
