# OTO — Banco de dados central (Web + Mobile)

Banco relacional **PostgreSQL 16** único, compartilhado pelo painel Web e pelo app do pesquisador
(RNF12). Implementa o MER do OTO: 30 tabelas, 2 views, auditoria e perfis de acesso separados.

```
oto-db/
├── docker-compose.yml        PostgreSQL 16 (+ pgAdmin opcional)
├── .env.example              senhas e configurações (copie para .env)
├── db/
│   ├── roles.sql             papéis de acesso, fuso horário, limites
│   ├── migrations/           V001 schema · V002 índices · V003 permissões  (versionadas)
│   └── seeds/                S01 UFs · S02 países · S03 municípios (gerado pelo script)
├── scripts/
│   ├── bootstrap.sh          cria/atualiza tudo (idempotente)
│   ├── carregar_municipios_ibge.py
│   ├── backup.sh · restore.sh
├── tests/smoke_test.sql      47 verificações de estrutura, integridade e permissões
└── Makefile                  atalhos (up, psql, migrate, backup, test…)
```

## 1. Subir o banco (Docker)

```bash
cp .env.example .env            # preencha as senhas (openssl rand -hex 24)
python3 scripts/carregar_municipios_ibge.py   # gera db/seeds/S03_municipios.sql (precisa de internet)
docker compose up -d            # na 1ª vez cria o volume e roda o bootstrap sozinho
docker compose logs db | tail   # deve terminar em "Pronto."
make test                       # deve terminar em "TODOS OS TESTES PASSARAM"
```

> O init do Docker só roda quando o volume é criado. Para aplicar migrações/seeds novos depois: `make migrate`.
> Se rodar o script dos municípios depois do banco já criado: `make migrate`.

### Sem Docker (PostgreSQL já instalado ou serviço gerenciado)

Qualquer PostgreSQL ≥ 13 serve (servidor próprio, RDS, Cloud SQL, Azure, Supabase, Neon…).
Crie um banco vazio e rode o bootstrap com as variáveis de conexão:

```bash
export PGHOST=... PGPORT=5432 PGUSER=<dono_do_banco> PGPASSWORD=... PGDATABASE=oto
export OTO_WEB_PASSWORD=... OTO_MOBILE_PASSWORD=... OTO_READONLY_PASSWORD=...
export OTO_APP_ADMIN_EMAIL=voce@exemplo.com OTO_APP_ADMIN_PASSWORD=...   # opcional
./scripts/bootstrap.sh
```

Requer que o usuário consiga `CREATE ROLE` e `CREATE EXTENSION pgcrypto` (extensão confiável no PG ≥ 13).

## 2. Como Web e Mobile usam o banco

| Perfil | Quem usa | Pode | Não pode |
|---|---|---|---|
| `oto_web` | back-end do painel Web | gerir formulários, usuários, dashboards; curadoria; importar planilhas; consultar auditoria | apagar pesquisas/respostas, mexer no log, criar tabelas |
| `oto_mobile` | **API de sincronização** do app | ler formulário e listas (municípios, países…); inserir pesquisas, respostas, sinalizações e lotes | ler senhas/e-mails, alterar ou apagar o que já enviou, ver dashboards e auditoria |
| `oto_readonly` | BI / relatórios | ler dados e views | escrever, ver senhas, códigos de acesso e auditoria |
| `oto_admin` | só você (migrações, backup) | tudo | — não use na aplicação |

**Importante:** o app do celular **não deve conectar direto no banco** (a senha ficaria dentro do APK).
Ele fala com uma API REST, e é essa API que usa o `oto_mobile`. O painel Web usa o `oto_web`.

```
postgresql://oto_web:<senha>@<host>:5432/oto        # back-end Web
postgresql://oto_mobile:<senha>@<host>:5432/oto     # API de sincronização
postgresql://oto_readonly:<senha>@<host>:5432/oto   # BI
```

### Regras que o back-end precisa seguir

1. **Auditoria (RF15):** no início de cada transação que altera dados, informar quem está agindo:
   `SELECT set_config('app.usuario_id', '<uuid do usuário>', true);` (e opcionalmente `app.dispositivo_id`).
   Sem isso o log é gravado, mas sem o autor. Funciona com PgBouncer em modo *transaction*.
2. **Sincronização idempotente (RF08):** o app gera o UUID da pesquisa. Envie com
   `INSERT INTO pesquisa (...) VALUES (...) ON CONFLICT (id) DO NOTHING` e conte as duplicadas em
   `lote_sincronizacao.qtd_duplicadas`. Reenviar um lote após queda de conexão não duplica nada.
3. **Exclusão lógica:** pesquisas e respostas nunca são apagadas; use `resposta.situacao = 'EXCLUIDA'`.
4. **Dashboards:** consulte `vw_resposta_valida` (ignora suspeitas pendentes e excluídas).
5. **Senhas do painel:** o administrador inicial é gravado em **bcrypt** (`$2a$`). Use uma biblioteca
   bcrypt compatível para validar o login.

## 3. Migrações

Alterações de estrutura = **novo arquivo** `db/migrations/V004__descricao.sql`, nunca edição de um antigo.
O `bootstrap.sh` aplica só as pendentes e **recusa** rodar se uma migração já aplicada foi alterada
(checksum). O histórico fica em `oto.schema_migrations`.

## 4. Backup e restauração

```bash
./scripts/backup.sh                                   # gera backups/oto_AAAAMMDD_HHMMSS.dump e valida
./scripts/restore.sh backups/oto_2026....dump oto_restaurado   # restaura em banco NOVO
```

Agende no cron (diário, 02:30) e guarde uma cópia **fora do servidor**. Retenção local: 14 dias
(`RETENCAO_DIAS`). Teste a restauração pelo menos uma vez antes de precisar dela.

## 5. Segurança — checklist antes de ir para produção

- [ ] Todas as senhas do `.env` trocadas por valores fortes; `.env` fora do Git.
- [ ] Banco acessível só por rede privada/VPN/túnel SSH (a porta publicada é `127.0.0.1`). Se expuser na internet: TLS obrigatório (`sslmode=require`) e firewall por IP.
- [ ] Senha do administrador inicial trocada no primeiro login.
- [ ] Backup automático agendado e cópia externa configurada.
- [ ] LGPD: o formulário atual não coleta nome/contato do turista. Se isso mudar, definir consentimento e retenção.

## 6. Decisões e ajustes em relação ao modelo original

- **Auditoria com `SECURITY DEFINER`:** os perfis da aplicação não têm permissão no log; só o trigger escreve nele.
- **Hash de senha fora do log:** o trigger remove `senha_hash` do antes/depois.
- **Alto volume:** `resposta`, `resposta_valor` e `avaliacao_item` auditam só `UPDATE/DELETE` (o `INSERT` já é rastreado por `pesquisa`). Evita dobrar o armazenamento a cada coleta.
- **Fuso:** banco em `America/Sao_Paulo`; todas as datas/horas são `timestamptz`.
- **Índices extras** nas chaves estrangeiras de consulta frequente (V002).

## 7. Pendente / a combinar com o grupo

- **Municípios IBGE:** não foi possível baixá-los no ambiente em que montei o projeto; rode `python3 scripts/carregar_municipios_ibge.py` uma vez (o script valida se vieram ≥ 5.500).
- **Cadastro do formulário de pesquisa** (seções, perguntas, opções) e dos **locais de coleta, serviços e atrativos**: ainda não estão no seed; entram pelo painel Web ou por um `S04_formulario.sql`.
- **Indicadores** (`indicador`): definir com o OTO a lista oficial (NPS, gasto médio, permanência…).
