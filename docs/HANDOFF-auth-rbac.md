# Handoff — branch `feat/auth-rbac`

Data: 2026-11-19. Sessão do Claude que trabalhava em login e permissões do painel (dashboard).

## Objetivo
- Aba **Análises** pública (dados abertos por lei). Abas **Coleta** e **Sistema** só com login.
- 3 perfis padrão: `ADMINISTRADOR`, `PESQUISADOR`, `VISUALIZADOR`.
  - Admin pode criar perfis novos e editar o que cada perfil enxerga.
  - VISUALIZADOR só enxerga Análises.
  - PESQUISADOR não entra no painel web (só no app).
- Criar 3 contas de teste (uma de cada perfil) para o Hugo ver funcionando.
- Abordagem: TDD, com atenção a segurança.

## O que foi feito (só testes, NADA implementado)
Testes escritos primeiro e confirmados **vermelhos**, porque `dashboard/src/lib/auth/*` não existe:

| Arquivo (`dashboard/test/`) | Cobre |
|---|---|
| `auth-permissoes.test.mjs` | Permissões dos 3 perfis; mapa rota→área (inclui `/coletar`, `/analises/../coleta`); área desconhecida nega. |
| `auth-token.test.mjs` | Cookie de sessão assinado: secret errado, payload adulterado, expirado, `alg=none` e outro algoritmo rejeitados; secret curto recusado. |
| `auth-senha.test.mjs` | bcrypt (inclusive hashes gerados pelo Postgres); usuário inexistente ainda gasta uma comparação bcrypt (anti-enumeração); regras de força de senha. |
| `auth-limitador.test.mjs` | Bloqueio por força bruta: janela, expiração, reset no sucesso, teto de memória. |
| `auth-origem.test.mjs` | Checagem de Origin/Referer (CSRF) e redirect aberto pós-login. |
| `auth.integration.test.mjs` | HTTP ponta a ponta (`npm run test:auth`, precisa do painel rodando). |

`dashboard/package.json`: os 5 unitários foram adicionados ao `npm test` e criado `npm run test:auth`.

A branch nasceu de `feat/ingestao-real` (já contém os commits de ingestão e testes do outro handoff).

## Onde parou
Hugo mandou criar a branch e fazer os testes antes. Os testes estão prontos e falhando. A pergunta pendente era "posso implementar?" — a resposta natural é sim.

## Próximos passos
1. `cd dashboard && npm i jose bcryptjs` (os testes exigem `jose`; confira a lib de bcrypt que `auth-senha.test.mjs` importa).
2. Criar `dashboard/src/lib/auth/` (permissoes, token, senha, limitador, origem) até `npm test` ficar verde.
3. Migration no `oto-db` (`V005__...`): tabelas de usuário/perfil/permissão por área.
4. Seed com 3 contas (admin, visualizador, pesquisador). Senhas fortes, fora do git, via variável de ambiente ou saída do script.
5. `middleware.ts`: Análises e `/api/analytics` públicos; Coleta, Sistema e `/api/state` exigem sessão e permissão. Cookie httpOnly + Secure + SameSite, sem confiar no campo `usuario` do corpo da requisição.
6. Tela `/login`, logout, e tela de admin para criar perfis e editar permissões.
7. Rodar `npm run test:auth` contra o painel local (banco demo `oto_demo`, porta 3000) até passar.
8. Garantir que o endpoint de sync do app (`/api/v1/pesquisas/lote`) continua exigindo token e não quebrou.
9. Abrir PR para `main`.

## Atenção
- Não rode os testes de integração do painel contra `oto_demo`: `CURAR_RESPOSTA` pode alterar sinalizações reais (ver handoff da ingestão).

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
   git checkout feat/auth-rbac
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
python3 demo/popular_demo.py --url http://localhost:3000 --total 700
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
