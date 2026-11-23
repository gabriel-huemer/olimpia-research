# OTO — Painel Web (`dashboard`)

Painel gerencial, operacional e analítico do **Observatório de Turismo de Olímpia (OTO)**, desenvolvido em **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS** e integrado ao banco de dados relacional central **PostgreSQL 16** (`../oto-db`).

Implementa integralmente as **15 telas** especificadas no protótipo **OTO – Painel Web**, os casos de uso (`UC05` a `UC16`) e os requisitos funcionais e não funcionais (`RF01`, `RF05`, `RF08`, `RF09`, `RF11` a `RF24`, `RNF01` a `RNF14`).

```text
dashboard/
├── .env.example                     Variáveis de conexão com o PostgreSQL (copie para .env.local)
├── next.config.mjs                  Configuração do Next.js
├── package.json                     Dependências e scripts (dev, build, start, lint)
├── tailwind.config.ts               Identidade visual OTO (cores, tipografia e layout)
├── tsconfig.json                    Configuração TypeScript estrita
└── src/
    ├── context/
    │   └── AppContext.tsx           Estado global, RBAC (perfis), filtros analíticos e exportação
    ├── components/
    │   ├── SidebarLayout.tsx        Menu lateral recolhível, busca rápida, contador de revisão e seletor de perfil
    │   └── FilterBar.tsx            Barra de filtros unificada das 5 abas de Análises + exportação PDF/Excel
    ├── lib/
    │   ├── db.ts                    Pool PostgreSQL (oto_web) + transação auditada (set_config app.usuario_id)
    │   ├── excel.ts                 Gerador de planilhas compatíveis com Excel (.xlsx/.xls) sem dependências vulneráveis
    │   └── mockAndSeedData.ts       Base de referência fiel ao PDF + cálculo dinâmico de indicadores filtrados
    └── app/
        ├── api/
        │   ├── analytics/route.ts   Consulta de indicadores analíticos (vw_resposta_valida + filtros)
        │   ├── state/route.ts       Operações de escrita auditadas (curadoria, formulários, operadores, usuários)
        │   └── v1/pesquisas/lote/   Endpoint REST de sincronização em lote do app mobile (UC05 / RF08)
        ├── analises/
        │   ├── panorama/            1. Visão geral executiva
        │   ├── infraestrutura/      2. Infraestrutura urbana e serviços
        │   ├── impacto-economico/   3. Impacto econômico e hospitalidade
        │   ├── perfil-turista/      4. Perfil do visitante e dinâmica dos grupos
        │   └── atracoes/            5. Atrações e mobilidade em Olímpia
        ├── coleta/
        │   ├── visao-geral/         6. Visão geral da operação de campo
        │   ├── formularios/         7. Lista e versionamento de formulários
        │   ├── formularios/editor/  8. Editor de formulário (10 seções, regras condicionais e prévia mobile)
        │   ├── pesquisas/           9. Pesquisas coletadas + inserção manual (UC13)
        │   ├── operadores/          10. Desempenho e gestão de operadores de campo (UC12)
        │   └── revisao/             11. Curadoria de respostas sinalizadas (UC08 / RF19)
        └── sistema/
            ├── publicacao/          12. Publicação e anonimização para o site da Prefeitura (UC14 / RF21)
            ├── importacao/          13. Importação de bases históricas em Excel (UC09 / RF09)
            ├── usuarios/            14. Gestão de usuários e matriz de permissões (UC10 / RF01)
            └── auditoria/           15. Trilha de auditoria somente leitura (UC11 / RF15)
```

---

## 1. Como executar o projeto

### Pré-requisitos
- **Node.js** ≥ 20 (testado em Node.js 24)
- **PostgreSQL 16** (`../oto-db`, opcional em desenvolvimento graças ao modo resiliente integrado)

### Passo a passo

```bash
cd dashboard
cp .env.example .env.local     # opcional: configure a senha do usuário oto_web do banco
npm install
npm run dev
```

Acesse **[http://localhost:3000](http://localhost:3000)** no navegador.
Com o servidor ativo, execute `npm run test:integration` em outro terminal para
validar a sincronização em lote, a idempotência, os filtros do Panorama e a lista de Pesquisas.

### Qual banco usar (real ou demonstração)

| | `oto` (real) | `oto_demo` (demonstração) |
|---|---|---|
| **Dados** | Pesquisas de verdade, feitas pelo app | 700 pesquisas **fictícias** (jan a nov/2026), geradas por script |
| **Quando usar** | Desenvolvimento do dia a dia, testes com o emulador, coleta de campo, homologação | Gravar vídeo, apresentar o projeto, mostrar gráficos "cheios" |
| **Arquivo de ambiente** | ``.env.real.local` | ``.env.demo.local` |
| **Painel inicia vazio?** | Sim (só o que você coletou) | Não: Panorama e lista de Pesquisas já vêm preenchidos |

Os dois bancos ficam no **mesmo container** PostgreSQL, com o mesmo schema e seeds. Quem escolhe o banco é o painel
(``.env.local`); o app Android sempre fala com o painel, então grava no banco que o painel estiver usando.

```bash
cp .env.demo.local `.env.local    # modo demonstração
cp .env.real.local `.env.local    # modo desenvolvimento (banco real)
# depois de trocar, reinicie o painel (npm run dev): as conexões ficam em memória
```

Como criar/recriar o banco demo: [../oto-db/demo/README.md](../oto-db/demo/README.md).

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento em `http://localhost:3000` |
| `npm run build` | Gera a build otimizada de produção e valida tipos TypeScript e rotas |
| `npm run start` | Executa o servidor de produção após `npm run build` |
| `npm run lint` | Executa a verificação estrita de tipos (`tsc --noEmit`) |
| `npm test` | Testes unitários da conversão dos valores do app (sem banco) |
| `npm run test:integration` | Testa o endpoint de sincronização, o Panorama com filtros e a lista de Pesquisas; requer o painel e o banco ativos |

---

## 2. Integração com o Banco de Dados Central (`../oto-db`)

O painel segue rigorosamente as regras de arquitetura definidas em `../oto-db/README.md` e `V001__schema_base.sql`:

1. **Menor privilégio (`oto_web`):** conecta utilizando o papel `oto_web` (`postgresql://oto_web:<senha>@127.0.0.1:5432/oto`) com `SET search_path = oto, public`.
2. **Auditoria automática (`RF15`):** toda transação que altera dados executa `SELECT set_config('app.usuario_id', $1, true)` via `withAuditTransaction()` em `src/lib/db.ts`, garantindo que a trigger `fn_auditar()` grave o autor em `oto.log_auditoria`.
3. **Exclusão lógica (`RN18` / `RF19`):** pesquisas e respostas nunca sofrem `DELETE` físico; quando excluídas na curadoria, recebem situação `EXCLUIDA` com justificativa obrigatória.
4. **Dashboards sobre respostas válidas (`RF12` / `RF14`):** consulta `oto.vw_resposta_valida` (que considera apenas respostas `NORMAL`, `APROVADA` ou `CORRIGIDA`).
5. **Login e perfis (`RF01`):** ver "Acesso e permissões" abaixo.
6. **Sincronização idempotente (`RF08` / `UC05`):** `POST /api/v1/pesquisas/lote` recebe os lotes do app, grava `pesquisa`, `resposta`, `resposta_valor`, `avaliacao_item` e `sinalizacao` com o papel **`oto_mobile`** (somente inserção) e ignora duplicatas pelo UUID da pesquisa. Reenviar um lote não duplica nada.

### Acesso e permissões

- **Análises** é pública (dados abertos): não precisa de login. **Coleta** e **Sistema** exigem login. A entrada da equipe fica em `/acesso-oto` ou com 5 cliques seguidos no logo OTO; nenhum link público aponta para ela.
- Perfis padrão (fixos): `ADMINISTRADOR` (tudo), `VISUALIZADOR` (o público: só Análises, **não faz login**) e `PESQUISADOR` (não entra no painel; usa o app).
  Em **Sistema → Usuários**, quem tem a área Sistema cria perfis novos, marca as áreas de cada um, cria usuários e ativa/desativa contas. Vale na hora: a sessão é revalidada no banco a cada requisição.
- Sessão: cookie `oto_sessao` HttpOnly, SameSite=Lax (Secure em HTTPS), JWT HS256 assinado com `AUTH_SECRET`, 8 h. Senhas em bcrypt (custo 12); login com bloqueio por força bruta; escrita só com `Origin` do próprio site (CSRF).
- Onde está: `src/lib/auth/` (regras e sessão), `src/proxy.ts` (redireciona páginas), `src/app/api/auth/*` e `src/app/api/admin/*`. No banco: `V005__perfis_acesso.sql`.
- Variáveis obrigatórias no `.env.local`: `AUTH_SECRET` (`openssl rand -hex 32`) e `SYNC_API_TOKEN` (`openssl rand -hex 24`). Sem elas, ninguém entra e o app não sincroniza (falha fechada).
- Contas de teste (uma por perfil): `../oto-db/scripts/criar_usuarios_teste.sh` (instruções no topo do script). As senhas saem num arquivo `.usuarios-teste*.env`, fora do Git.

### Ligando o app Android ao painel

O app só envia ao painel se for compilado com a URL da API; **sem ela usa um servidor simulado e mostra "sincronizada" sem enviar nada**. O painel exige o mesmo `SYNC_API_TOKEN` do `.env.local`:

```bash
flutter run --dart-define=SYNC_API_URL=http://10.0.2.2:3000 --dart-define=SYNC_API_TOKEN=<token>     # emulador (10.0.2.2 = o seu PC)
flutter run --dart-define=SYNC_API_URL=http://192.168.x.x:3000 --dart-define=SYNC_API_TOKEN=<token>  # celular físico (mesma rede; libere a porta 3000)
```

Requisitos no banco (`../oto-db`): seeds `S04` (formulário) e `S05` (pesquisadores `OTO482`, `OTO117`, `OTO305`) aplicados e `OTO_MOBILE_PASSWORD` no `.env.local`.

### Testes

```bash
npm test                    # conversão dos valores do app (sem banco)
npm run test:integration    # exige o painel rodando + banco; grava pesquisas de teste. NÃO use no banco de demonstração (oto_demo);
                            # aponte o painel para um banco descartável (ex.: create database oto_test) e use DASHBOARD_URL=http://localhost:3100
```

> **Em migração:** o Panorama e a lista de Pesquisas já leem do banco. As demais abas de Análises, Operadores, Curadoria, Formulários, Usuários e Auditoria ainda usam dados de exemplo (`mockAndSeedData.ts`) e serão ligadas ao banco nas próximas etapas.

---

## 3. Perfis de Acesso e Permissões (`RF01` / `RNF08`)

No rodapé da barra lateral esquerda, é possível alternar em tempo real entre os perfis para validar o bloqueio de ações administrativas:

| Função | Administradora | Gestor | Editor | Visualizador |
|---|:---:|:---:|:---:|:---:|
| Consultar dashboards e exportar relatórios | ✓ | ✓ | ✓ | ✓ |
| Criar, duplicar, editar e publicar formulários | ✓ | ✓ | — | — |
| Revisar, aprovar, corrigir e excluir respostas | ✓ | ✓ | — | — |
| Inserir resposta manual (`UC13`) | ✓ | ✓ | ✓ | — |
| Publicar indicadores no site (`UC14`) | ✓ | ✓ | — | — |
| Importar planilhas históricas (`UC09`) | ✓ | ✓ | — | — |
| Gerenciar usuários e perfis (`UC10`) | ✓ | — | — | — |
