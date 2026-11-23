# Hospedagem

Arquivos para publicar o OTO em um servidor Linux com Docker. **Nada disto foi colocado no ar:** falta escolher o servidor e o domínio.

1. **Banco:** em `oto-db/`, preencha o `.env`, gere os municípios (`make municipios`) e rode `docker compose up -d`.
   Em um banco que já existe, rode `make backup` e depois `make migrate`.
2. **Painel e HTTPS:** em `deploy/`, `cp .env.example .env`, preencha e rode `docker compose up -d --build`. O domínio precisa
   apontar para o servidor, com as portas 80 e 443 abertas.
3. **App:** `flutter build apk --release --dart-define=SYNC_API_URL=https://SEU-DOMINIO --dart-define=SYNC_API_TOKEN=...`
   (a assinatura de loja ainda precisa ser configurada).
4. **Antes de usar de verdade:** desative os operadores de exemplo (OTO482, OTO117 e OTO305) e não crie as contas de teste.

**Backup:** agende `oto-db/scripts/backup.sh` no cron (exemplo no topo do arquivo; guarda 14 dias). Copie os arquivos para outra
máquina e teste a volta com `scripts/restore.sh`, que sempre restaura em um banco novo.

**Atualizar:** `make backup`, `git pull`, `make migrate` em `oto-db/` e `docker compose up -d --build` em `deploy/`.

## Tailscale (opcional)

1. Instale o Tailscale no servidor e nos computadores da equipe e entre na mesma rede.
2. No `deploy/.env`, use `OTO_CADDYFILE=Caddyfile.tailscale` e recrie com `docker compose up -d`.
3. Na equipe, o domínio precisa apontar para o IP Tailscale do servidor (Split DNS no Tailscale); senão o acesso chega pela internet e dá 404.
4. Confira antes de confiar: de um celular fora da rede, `/administracao` deve dar 404 e `/analises/panorama` deve abrir. Se der 404
   também dentro da rede, o Docker está trocando o IP de origem; rode o Caddy direto no servidor.

O app de campo continua funcionando fora da rede: `/api/v1/*` fica aberto e exige o token.
