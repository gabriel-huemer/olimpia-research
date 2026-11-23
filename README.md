# OTO — Observatório de Turismo de Olímpia

[![CI](https://github.com/gabriel-huemer/olimpia-research/actions/workflows/ci.yml/badge.svg)](https://github.com/gabriel-huemer/olimpia-research/actions/workflows/ci.yml)

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=gabriel-huemer_olimpia-research&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gabriel-huemer_olimpia-research)

Sistema para a Secretaria de Turismo de Olímpia (SP) coletar e analisar pesquisas com turistas. O pesquisador aplica o
questionário pelo app, mesmo sem internet, e os gestores acompanham os resultados no painel web.

Projeto do Grupo 7 da disciplina SSC0536 – Projeto e Desenvolvimento de Sistemas de Informação (ICMC-USP, 2026).

## Telas

App do pesquisador (protótipo no Figma):

![App do pesquisador](docs/telas/app-prototipo.png)

Painel web:

![Visão geral do painel](docs/telas/painel-panorama.png)

![Curadoria de respostas suspeitas](docs/telas/painel-curadoria.png)

## Estrutura

| Pasta | O que é | Tecnologia |
|---|---|---|
| `android-app-olimpia/` | App do pesquisador de campo | Flutter |
| `dashboard/` | Painel web dos gestores | Next.js |
| `oto-db/` | Banco de dados central | PostgreSQL 16 |

Como rodar cada parte: [oto-db/README.md](oto-db/README.md) e [dashboard/README.md](dashboard/README.md).

## Bancos de dados: real e demonstração

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

Como criar/recriar o banco demo: [oto-db/demo/README.md](oto-db/demo/README.md).

## Equipe

Hugo Rubira Zanni, Gabriel Huemer, João Pedro Baratella Mattos, Mark Seiji Takakura, Gabriel de Oliveira Merenciano e
Breno Wingeter de Castilho.
