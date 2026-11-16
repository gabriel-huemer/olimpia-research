import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/mockAndSeedData";
import { isDatabaseAvailable, withAuditTransaction } from "@/lib/db";

function formatNowShort(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

export async function GET() {
  const store = getStore();
  const dbConnected = await isDatabaseAvailable();
  const pendentesRevisao = store.revisao.filter((r) => r.status === "PENDENTE").length;

  return NextResponse.json({
    dbConnected,
    pendentesRevisao,
    ...store,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, payload, usuario = "Maria Oliveira", usuarioUuid = null } = body;
  const store = getStore();
  const nowShort = formatNowShort();

  // Se o banco PostgreSQL (oto-db) estiver ativo, executa com set_config('app.usuario_id', ...)
  const dbActive = await isDatabaseAvailable();

  switch (action) {
    case "CURAR_RESPOSTA": {
      const { id, decisao, novoValor, motivo } = payload;
      const item = store.revisao.find((r) => r.id === Number(id));
      if (!item) {
        return NextResponse.json({ error: "Item de revisão não encontrado" }, { status: 404 });
      }

      const valorAntigo = item.valorSuspeito;
      if (decisao === "APROVAR") {
        item.status = "APROVADA";
        const pesq = store.pesquisas.find((p) => p.protocolo === item.protocolo);
        if (pesq) pesq.situacao = "Aprovada";
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Corrigiu",
          item: "Pesquisa",
          protocoloBadge: item.protocolo,
          alteracao: `${item.campoSuspeito.toLowerCase()}: ${valorAntigo} mantido (aprovado na curadoria)`,
        });
      } else if (decisao === "CORRIGIR") {
        item.status = "CORRIGIDA";
        item.valorSuspeito = String(novoValor);
        if (item.campoSuspeito === "Idade") {
          item.dadosColeta.idade = String(novoValor);
        }
        const pesq = store.pesquisas.find((p) => p.protocolo === item.protocolo);
        if (pesq) pesq.situacao = "Aprovada";
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Corrigiu",
          item: "Pesquisa",
          protocoloBadge: item.protocolo,
          alteracao: `${item.campoSuspeito.toLowerCase()}: ${valorAntigo} → ${novoValor} · motivo: ${motivo || "confirmado na curadoria"}`,
        });
      } else if (decisao === "EXCLUIR") {
        item.status = "EXCLUIDA";
        const pesq = store.pesquisas.find((p) => p.protocolo === item.protocolo);
        if (pesq) pesq.situacao = "Excluída";
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Excluiu",
          item: "Pesquisa",
          protocoloBadge: item.protocolo,
          alteracao: `${motivo || "inconsistência confirmada"} · motivo registrado`,
        });
      }

      if (dbActive) {
        try {
          await withAuditTransaction(usuarioUuid, async (client) => {
            const novoStatus =
              decisao === "APROVAR"
                ? "APROVADA"
                : decisao === "CORRIGIR"
                ? "CORRIGIDA"
                : "EXCLUIDA";
            await client.query(
              `UPDATE oto.sinalizacao
                  SET status = $1, curada_em = now(), justificativa = $2,
                      valor_corrigido = $3
                WHERE id = $4`,
              [
                novoStatus,
                motivo || "Decisão registrada no painel Web",
                novoValor ? JSON.stringify({ valor: novoValor }) : null,
                Number(id),
              ]
            );
          });
        } catch {
          // Mantém o estado atualizado mesmo se o registro específico for do seed em memória
        }
      }
      break;
    }

    case "INSERIR_PESQUISA_MANUAL": {
      const { origem, local, idade, genero, gastoDiario, canalRecebimento } = payload;
      const nextNum = 48 + store.pesquisas.length;
      const protocolo = `${String(nextNum).padStart(4, "0")}/26`;
      const novaPesquisa = {
        id: `p-${Date.now()}`,
        protocolo,
        origem: origem || "— (telefone)",
        operador: "Gestão (manual)",
        local: local || "—",
        coletada: nowShort,
        periodo: "Out/2026",
        situacao: "Inserida manualmente" as const,
      };
      store.pesquisas.unshift(novaPesquisa);
      const formAtivo = store.formularios.find((f) => f.status === "Ativo");
      if (formAtivo) formAtivo.respostas += 1;

      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Inseriu",
        item: "Pesquisa",
        protocoloBadge: protocolo,
        alteracao: `resposta recebida por ${canalRecebimento || "telefone"} (${genero || "N/I"}, ${idade || "—"} anos, R$ ${gastoDiario || "350"})`,
      });
      break;
    }

    case "CRIAR_OPERADOR": {
      const { nome, localHabitual } = payload;
      const randomCode = `OTO-${Math.floor(100 + Math.random() * 899)}`;
      const novoOp = {
        id: `op-${Date.now()}`,
        nome,
        codigo: randomCode,
        coletas7Dias: 0,
        coletas30Dias: 0,
        alertas7Dias: 0,
        taxaAlerta: 0,
        ultimoEnvio: "agora",
        statusEnvio: "normal" as const,
        localHabitual: localHabitual || "Thermas dos Laranjais",
        mediaDiaria: 0,
        serieDiaria: [0, 0, 0, 0, 0, 0, 0],
        ativo: true,
      };
      store.operadores.push(novoOp);
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Inseriu",
        item: `Operador ${nome}`,
        alteracao: `código gerado: ${randomCode} · local: ${novoOp.localHabitual}`,
      });
      break;
    }

    case "REDEFINIR_CODIGO_OPERADOR": {
      const { id } = payload;
      const op = store.operadores.find((o) => o.id === id);
      if (op) {
        const codigoAntigo = op.codigo;
        const novoCodigo = `OTO-${Math.floor(100 + Math.random() * 899)}`;
        op.codigo = novoCodigo;
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Corrigiu",
          item: `Operador ${op.nome}`,
          alteracao: `código redefinido: ${codigoAntigo} → ${novoCodigo}`,
        });
      }
      break;
    }

    case "ALTERNAR_STATUS_OPERADOR": {
      const { id } = payload;
      const op = store.operadores.find((o) => o.id === id);
      if (op) {
        op.ativo = !op.ativo;
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Corrigiu",
          item: `Operador ${op.nome}`,
          alteracao: `status alterado para ${op.ativo ? "ativo" : "desativado"}`,
        });
      }
      break;
    }

    case "SALVAR_PERGUNTA_FORMULARIO": {
      const { secaoId, pergunta } = payload;
      const formAtivo = store.formularios[0];
      const secao = formAtivo.secoes.find((s) => s.id === Number(secaoId));
      if (secao) {
        const idx = secao.perguntas.findIndex((p) => p.id === Number(pergunta.id));
        if (idx >= 0) {
          secao.perguntas[idx] = { ...secao.perguntas[idx], ...pergunta };
        } else {
          secao.perguntas.push({
            ...pergunta,
            id: Date.now(),
          });
        }
      }
      break;
    }

    case "ADICIONAR_SECAO_FORMULARIO": {
      const { titulo } = payload;
      const formAtivo = store.formularios[0];
      const novaOrdem = formAtivo.secoes.length + 1;
      formAtivo.secoes.push({
        id: Date.now(),
        ordem: novaOrdem,
        titulo: titulo || `Nova seção ${novaOrdem}`,
        perguntas: [],
      });
      break;
    }

    case "PUBLICAR_FORMULARIO": {
      const { versaoNome = "v4", secoes } = payload;
      // Encerra a versão ativa anterior e publica a nova versão (RF05 / UC07)
      const atualAtivo = store.formularios.find(
        (f) => f.nome === "Pesquisa de Demanda Turística" && f.status === "Ativo"
      );
      if (atualAtivo) {
        atualAtivo.status = "Encerrada";
      }
      const novoForm = {
        id: Date.now(),
        nome: "Pesquisa de Demanda Turística",
        versao: versaoNome,
        numeroVersao: (atualAtivo?.numeroVersao || 3) + 1,
        status: "Ativo" as const,
        respostas: 0,
        vigencia: "a partir de hoje a 31/12/2026",
        atualizado: nowShort.split(" ")[0] + "/2026",
        secoes: secoes || atualAtivo?.secoes || [],
      };
      store.formularios.unshift(novoForm);
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Publicou",
        item: `Formulário ${versaoNome}`,
        alteracao: "status: rascunho → ativo (versão anterior preservada)",
      });
      break;
    }

    case "CRIAR_FORMULARIO": {
      const { nome, vigencia } = payload;
      const BaseSecoes = store.formularios[0]?.secoes || [];
      store.formularios.push({
        id: Date.now(),
        nome: nome || "Nova Pesquisa Turística",
        versao: "v1",
        numeroVersao: 1,
        status: "Rascunho",
        respostas: 0,
        vigencia: vigencia || "não definida",
        atualizado: nowShort.split(" ")[0] + "/2026",
        secoes: JSON.parse(JSON.stringify(BaseSecoes)),
      });
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Inseriu",
        item: `Formulário ${nome} v1`,
        alteracao: "criado como rascunho",
      });
      break;
    }

    case "TOGGLE_ITEM_PUBLICACAO": {
      const { id } = payload;
      const item = store.publicacaoItens.find((i) => i.id === id);
      if (item) {
        item.publico = !item.publico;
      }
      break;
    }

    case "PUBLICAR_SELECAO_SITE": {
      const { metodo } = payload;
      if (metodo) store.metodoPublicacao = metodo;
      store.ultimaPublicacao = `${nowShort} por ${usuario}`;
      const qtdPublicados = store.publicacaoItens.filter((i) => i.publico).length;
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Publicou",
        item: "Painel Público do Site",
        alteracao: `${qtdPublicados} indicadores publicados (${store.metodoPublicacao})`,
      });
      break;
    }

    case "RESOLVER_PROBLEMA_IMPORTACAO": {
      const { id } = payload;
      const prob = store.problemasImportacao.find((p) => p.id === Number(id));
      if (prob) {
        prob.resolvido = true;
        prob.resolucao = prob.acaoTexto;
      }
      break;
    }

    case "CONCLUIR_IMPORTACAO": {
      const { arquivoNome = "demanda_2024.xlsx" } = payload || {};
      store.importacaoConcluida = true;
      store.problemasImportacao.forEach((p) => {
        p.resolvido = true;
      });
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Inseriu",
        item: `Importação ${arquivoNome}`,
        alteracao: "3.412 linhas válidas importadas · 112 duplicadas ignoradas · 38 tratadas",
      });
      break;
    }

    case "CRIAR_USUARIO": {
      const { nome, email, perfil } = payload;
      store.usuarios.push({
        id: `u-${Date.now()}`,
        nome,
        email: email || `${nome.toLowerCase().replace(/\s+/g, ".")}@exemplo.com`,
        perfil: perfil || "Visualizador",
        status: "Ativo",
      });
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: nowShort,
        usuario,
        acao: "Inseriu",
        item: `Usuário ${nome}`,
        alteracao: `perfil atribuído: ${perfil}`,
      });
      break;
    }

    case "ATUALIZAR_USUARIO": {
      const { id, perfil, status } = payload;
      const u = store.usuarios.find((usr) => usr.id === id);
      if (u) {
        const antes = `${u.perfil} (${u.status})`;
        if (perfil) u.perfil = perfil;
        if (status) u.status = status;
        store.auditoria.unshift({
          id: Date.now(),
          dataHora: nowShort,
          usuario,
          acao: "Corrigiu",
          item: `Usuário ${u.nome}`,
          alteracao: `${antes} → ${u.perfil} (${u.status})`,
        });
      }
      break;
    }
  }

  const pendentesRevisao = store.revisao.filter((r) => r.status === "PENDENTE").length;
  return NextResponse.json({
    ok: true,
    pendentesRevisao,
    ...store,
  });
}
