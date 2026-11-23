# Handoff — branch `feat/ingestao-real`

Data: 2026-11-19. Sessão do Claude que cuidava de rodar o projeto, ligar app e painel ao mesmo banco real e criar testes/CI.

## O que foi feito (commits `628d233`, `d1dcb5d`, `c4fd9dc`, `5f04606`)
- **Ingestão real**: o app Flutter envia pesquisas para `/api/v1/pesquisas/lote`, que grava no PostgreSQL (`dashboard/src/lib/ingestao/`). A rota antiga `/api/sync/lote` foi removida.
- **Panorama e lista de Pesquisas** agora leem do banco (`lib/panorama.ts`, `lib/pesquisas.ts`, `api/analytics`), não mais de números mockados.
- **Banco**: `V004__item_avaliacao_codigo.sql`, seeds `S04_formulario` e `S05_pesquisadores`, script `gerar_seed_formulario.py`.
- **Banco demo** (`oto-db/demo/`, `popular_demo.py`): segundo banco `oto_demo` com dados fictícios para gravar vídeo. Ver `oto-db/demo/README.md` e o README principal para quando usar cada banco. Já foi testado: pesquisa enviada pelo app apareceu no painel.
- **CI** (`.github/workflows/ci.yml`): jobs do painel e do app, mais job de integração com Postgres.
- **Testes**:
  - Painel: conversão, Excel, Panorama, lista de Pesquisas, sync em lote, ações do painel (curadoria, operadores, usuários).
  - App Flutter: contrato HTTP, fila de sincronização, regras de suspeição, login/pesquisa, payload.
  - Último resultado: painel 11 unitários e 27 de integração passando (em banco isolado); Flutter 41 passando.
- Pesquisa de formato de exportação para o prefeito: 3 layouts completos com dados semanais foram feitos como artefatos e enviados a ele (nada de código de exportação ainda).

## Onde parou
Os 4 commits estavam só locais. Faltava abrir o PR, dependendo de acesso de escrita ao repo do Gabriel (`gabriel-huemer/olimpia-research`).

## Próximos passos
1. Abrir PR `feat/ingestao-real` → `main` e ver o CI rodar; corrigir o que falhar.
2. **SonarCloud**: restaurar o scan (alinhar project key/org, secret `SONAR_TOKEN`, gerar cobertura Flutter/painel, recriar o workflow). Depende de acesso.
3. **Exportação**: aguardar resposta do prefeito (formato PDF/PPTX/Excel, regras vs. sugestões revisadas, filtros, identidade visual) e então implementar.
4. Migrar as telas ainda mockadas para o banco, decidindo quais precisam persistir antes do lançamento.
5. Lacunas de teste: mappers do app (`questionnaire_mapper`, `survey_mapper`), widgets de autocomplete/escolha, e login/permissões do painel (feito na branch `feat/auth-rbac`).

## Atenção
- **Resolvido (feat/curadoria)**: a curadoria agora lê e grava sinalizações reais por `/api/curadoria`; `CURAR_RESPOSTA` não existe mais. O bug descrito antes não alterava dados: o banco recusava o UPDATE (faltava o curador) e o erro era escondido. Os testes de integração continuam só em banco descartável, nunca no `oto_demo`.
- `oto-db/db/seeds/S03_municipios.sql` é gerado por `oto-db/scripts/carregar_municipios_ibge.py` (precisa de internet) e não está versionado de propósito. Rode o script ao subir o banco numa máquina nova.
- Ambiente: Docker Desktop com Postgres, Flutter instalado localmente, painel Next.js na porta 3000. Máquina com pouca memória: o `next dev` foi encerrado algumas vezes por falta de RAM.

---

# Setup do ambiente (reproduz o ambiente do computador anterior)

Versões usadas: Node 24, Python 3.12, Docker 29 (Docker Desktop), Flutter 3.41.9 (Dart SDK ^3.11.5), emulador Android `Pixel_8`, Windows 11 com Git Bash. Os comandos abaixo são para Git Bash.

## 0. Pré-requisitos
1. Instalar: Git, Node ≥ 20, Python 3, Docker Desktop (abrir e deixar rodando), Android Studio (SDK, platform-tools e emulador).
2. Flutter 3.41.x: `git clone -b stable https://github.com/flutter/flutter C:/src/flutter` (ou baixar o zip da versão 3.41.9) e colocar `C:\src\flutter\bin` no PATH. Depois `flutter doctor` e `flutter doctor --android-licenses`.
3. Criar um AVD `Pixel_8` no Android Studio (Device Manager).
4. Clonar e entrar na branch:
   ```bash
   git clone https://github.com/gabriel-huemer/olimpia-research.git && cd olimpia-research
   git checkout <esta-branch>     # feat/ingestao-real ou feat/auth-rbac
   ```

## 1. Banco de dados (PostgreSQL 16 em Docker)
O ambiente anterior usava a **porta 5434** no host (a 5432 estava ocupada). Mantenha 5434 para os `.env` abaixo baterem.

```bash
cd oto-db
cp .env.example .env
# Edite o .env: OTO_DB_PORT=5434 e preencha TODAS as senhas (sem caracteres especiais):
#   openssl rand -hex 24   (uma para cada: OTO_DB_ADMIN_PASSWORD, OTO_WEB_PASSWORD, OTO_MOBILE_PASSWORD, OTO_READONLY_PASSWORD)
# OTO_APP_ADMIN_EMAIL / OTO_APP_ADMIN_PASSWORD são opcionais (admin inicial do painel).
python3 scripts/carregar_municipios_ibge.py    # gera db/seeds/S03_municipios.sql (precisa de internet; arquivo não é versionado)
docker compose up -d                           # 1ª vez: cria o volume e roda o bootstrap sozinho
docker compose logs db | tail                  # deve terminar em "Pronto."
make test                                      # (opcional) "TODOS OS TESTES PASSARAM"; sem make: ver Makefile
```
As senhas não vão para o Git (`.env` é ignorado). Como o banco é recriado, as senhas novas servem desde que os `.env` do painel usem as mesmas.

Seeds que entram sozinhos: UFs, países, municípios, formulário (S04) e 3 pesquisadores de teste (S05): **OTO482** (Ana Souza), **OTO117** (Bruno Lima), **OTO305** (Carla Mendes). Use esses códigos para entrar no app.

## 2. Banco de demonstração `oto_demo` (700 pesquisas fictícias)
Mesmo container, banco separado. Serve para gravar vídeo; os dados são gerados por script, com semente fixa (`--semente 42` por padrão), então saem iguais.

```bash
# a) criar o banco e aplicar schema + seeds nele (rodar em oto-db/)
docker exec oto-db psql -U oto_admin -d postgres -c "create database oto_demo"
MSYS_NO_PATHCONV=1 docker exec -e PGUSER=oto_admin -e PGDATABASE=oto_demo oto-db bash /oto/scripts/bootstrap.sh
```
(Se `OTO_DB_ADMIN_USER` no `.env` não for `oto_admin`, troque no comando. O `bootstrap.sh` lê as senhas do ambiente do container, que o compose já injeta.)

```bash
# b) apontar o painel para o demo e subir (em dashboard/, ver seção 3)
cp .env.demo.local .env.local && npm run dev

# c) em outro terminal, popular via o mesmo endpoint do app (em oto-db/)
python3 demo/popular_demo.py --porta 3000 --total 700
```
Resultado: Panorama e lista de Pesquisas cheios (jan a nov/2026), 10 respostas sinalizadas para a curadoria, protocolos demo a partir de `OTO482-1001`. Detalhes em `oto-db/demo/README.md`. Para refazer do zero: parar o painel, `docker exec oto-db psql -U oto_admin -d postgres -c "drop database oto_demo"` e repetir a)–c).

## 3. Painel (Next.js, pasta `dashboard`)
Crie os dois arquivos de ambiente (ignorados pelo Git; use as senhas do `oto-db/.env`):

`dashboard/.env.real.local` (banco `oto`):
```
DATABASE_URL=postgresql://oto_web:<OTO_WEB_PASSWORD>@127.0.0.1:5434/oto
OTO_DB_HOST=127.0.0.1
OTO_DB_PORT=5434
OTO_DB_NAME=oto
OTO_DB_USER=oto_web
OTO_DB_PASSWORD=<OTO_WEB_PASSWORD>
OTO_MOBILE_PASSWORD=<OTO_MOBILE_PASSWORD>
```
`dashboard/.env.demo.local`: igual, trocando `oto` por `oto_demo` em `DATABASE_URL` e `OTO_DB_NAME`.

```bash
cd dashboard
npm install
cp .env.demo.local .env.local     # vídeo/apresentação (banco cheio)
# ou: cp .env.real.local .env.local   # desenvolvimento (banco vazio)
npm run dev                       # http://localhost:3000 ; reinicie ao trocar o .env.local
```
Quem escolhe o banco é o painel; o app grava no banco que o painel estiver usando.

## 4. App Flutter (pasta `android-app-olimpia`)
```bash
cd android-app-olimpia
flutter pub get
flutter emulators --launch Pixel_8        # ou abra o emulador pelo Android Studio
flutter run --dart-define=SYNC_API_URL=http://10.0.2.2:3000    # 10.0.2.2 = o PC visto do emulador
```
Sem `SYNC_API_URL` o app usa um servidor simulado e mostra "sincronizada" sem enviar nada. Celular físico: `http://<IP-do-PC>:3000` na mesma rede, liberando a porta 3000 no firewall. Login com `OTO482`, `OTO117` ou `OTO305`.

## 5. Conferir que está igual
- `cd dashboard && npm test` (unitários) e, com painel e banco ativos, `npm run test:integration`.
- `cd android-app-olimpia && flutter test` (41 testes passando no ambiente anterior).
- Envie uma pesquisa pelo emulador e veja o Panorama do painel subir.
- **Cuidado:** não rode os testes de integração do `state` contra `oto_demo` (ver "Atenção" acima). Use um banco descartável.

## 6. O que NÃO veio no Git
Senhas e `.env*`, `S03_municipios.sql` (gerado), dados que você criou à mão no banco `oto` (só o demo é reproduzível), e a pasta `build/` do app (o `flutter run` recria). O `mcp.json` versionado no repo contém uma chave do Figma que veio do repositório original do Gabriel; vale pedir a ele para revogar e remover.
