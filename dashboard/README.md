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
        │   └── sync/lote/route.ts   Endpoint REST de sincronização em lote do app mobile (UC05 / RF08)
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
validar a sincronização em lote, a idempotência e a consulta posterior do estado.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento em `http://localhost:3000` |
| `npm run build` | Gera a build otimizada de produção e valida tipos TypeScript e rotas |
| `npm run start` | Executa o servidor de produção após `npm run build` |
| `npm run lint` | Executa a verificação estrita de tipos (`tsc --noEmit`) |
| `npm run test:integration` | Testa o endpoint de sincronização e o estado persistido em memória; requer o servidor ativo |

---

## 2. Integração com o Banco de Dados Central (`../oto-db`)

O painel segue rigorosamente as regras de arquitetura definidas em `../oto-db/README.md` e `V001__schema_base.sql`:

1. **Menor privilégio (`oto_web`):** conecta utilizando o papel `oto_web` (`postgresql://oto_web:<senha>@127.0.0.1:5432/oto`) com `SET search_path = oto, public`.
2. **Auditoria automática (`RF15`):** toda transação que altera dados executa `SELECT set_config('app.usuario_id', $1, true)` via `withAuditTransaction()` em `src/lib/db.ts`, garantindo que a trigger `fn_auditar()` grave o autor em `oto.log_auditoria`.
3. **Exclusão lógica (`RN18` / `RF19`):** pesquisas e respostas nunca sofrem `DELETE` físico; quando excluídas na curadoria, recebem situação `EXCLUIDA` com justificativa obrigatória.
4. **Dashboards sobre respostas válidas (`RF12` / `RF14`):** consulta `oto.vw_resposta_valida` (que considera apenas respostas `NORMAL`, `APROVADA` ou `CORRIGIDA`).
5. **Sincronização idempotente (`RF08` / `UC05`):** o endpoint `POST /api/sync/lote` recebe lotes do aplicativo mobile e ignora duplicatas pelo identificador único da pesquisa.

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
