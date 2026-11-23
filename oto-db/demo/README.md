# Banco de demonstração (`oto_demo`)

Banco separado, com **700 pesquisas fictícias** (jan a nov/2026), para gravar vídeos e apresentações sem
tocar no banco real (`oto`). Está no mesmo container PostgreSQL, com o mesmo schema e seeds.

Os dados são inventados e entram pelo mesmo endpoint do app (`POST /api/v1/pesquisas/lote`), então passam
pela mesma validação, conversão e auditoria de uma coleta real. Inclui 10 respostas sinalizadas para a curadoria.
O protocolo demo começa em `OTO482-1001`, para não colidir com pesquisas feitas pelo app no emulador.

## Quando usar cada banco

| | `oto` (real) | `oto_demo` (demonstração) |
|---|---|---|
| **Dados** | Pesquisas de verdade, feitas pelo app | 700 pesquisas **fictícias** (jan a nov/2026), geradas por script |
| **Quando usar** | Desenvolvimento do dia a dia, testes com o emulador, coleta de campo, homologação | Gravar vídeo, apresentar o projeto, mostrar gráficos "cheios" |
| **Arquivo de ambiente** | `dashboard/.env.real.local` | `dashboard/.env.demo.local` |
| **Painel inicia vazio?** | Sim (só o que você coletou) | Não: Panorama e lista de Pesquisas já vêm preenchidos |

Os dois bancos ficam no **mesmo container** PostgreSQL, com o mesmo schema e seeds. Quem escolhe o banco é o painel
(`dashboard/.env.local`); o app Android sempre fala com o painel, então grava no banco que o painel estiver usando.

```bash
cp dashboard/.env.demo.local dashboard/.env.local    # modo demonstração
cp dashboard/.env.real.local dashboard/.env.local    # modo desenvolvimento (banco real)
# depois de trocar, reinicie o painel (npm run dev): as conexões ficam em memória
```

Como criar/recriar o banco demo: [README.md](README.md).

## Começar rápido (um comando)

Precisa de Docker, Node 20+ e Python 3.9+:

```bash
cd oto-db
make demo                        # ou: python3 demo/iniciar_demo.py   (no Windows: py demo\iniciar_demo.py)
```

Cria as senhas (em arquivos fora do Git), o banco `oto_demo`, as 700 pesquisas e abre o painel em <http://localhost:3000>
(outra porta: `make demo PORTA=3001`). Pode rodar de novo: só faz o que falta, não apaga nada e não usa o banco `oto`.
Precisa de internet na primeira vez. E-mail e senha da equipe: `oto-db/.usuarios-teste.oto_demo.env`.
Cada pessoa tem o seu banco: o que uma coleta não aparece para as outras.

**App no emulador:** em `android-app-olimpia/`, rode
`flutter run --dart-define=SYNC_API_URL=http://10.0.2.2:3000 --dart-define=SYNC_API_TOKEN=<o de dashboard/.env.demo.local>`.

## Criar / recriar à mão

```bash
cd oto-db
docker exec oto-db psql -U oto_admin -d postgres -c "create database oto_demo"
MSYS_NO_PATHCONV=1 docker exec -e PGUSER=oto_admin -e PGDATABASE=oto_demo oto-db bash /oto/scripts/bootstrap.sh
# painel rodando apontado para o demo (abaixo), depois:
SYNC_API_TOKEN=<o mesmo do dashboard/.env.demo.local> \
  python3 demo/popular_demo.py --porta 3000 --total 700   # --semente muda os dados
```

Para recomeçar do zero: pare o painel, `drop database oto_demo`, e repita. (O `MSYS_NO_PATHCONV` só é
necessário no Git Bash do Windows.)

## Apontar o painel para o demo ou para o banco real

O painel lê `dashboard/.env.local`. Mantenha dois arquivos (ambos fora do Git):

| Arquivo | Banco |
|---|---|
| `dashboard/.env.demo.local` | `oto_demo` |
| `dashboard/.env.real.local` | `oto` |

```bash
cp dashboard/.env.demo.local dashboard/.env.local    # vídeo
cp dashboard/.env.real.local dashboard/.env.local    # desenvolvimento
```

**Reinicie o `npm run dev` depois de trocar** (as conexões ficam em memória). O app Android não precisa de
mudança: ele fala com o painel (`--dart-define=SYNC_API_URL=...`), então grava no banco que o painel estiver usando.
