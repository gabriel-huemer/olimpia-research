# OTO — Observatório de Turismo de Olímpia

[![CI](https://github.com/gabriel-huemer/olimpia-research/actions/workflows/ci.yml/badge.svg)](https://github.com/gabriel-huemer/olimpia-research/actions/workflows/ci.yml)

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

## Equipe

Hugo Rubira Zanni, Gabriel Huemer, João Pedro Baratella Mattos, Mark Seiji Takakura, Gabriel de Oliveira Merenciano e
Breno Wingeter de Castilho.
