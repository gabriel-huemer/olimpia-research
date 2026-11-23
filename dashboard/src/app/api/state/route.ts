import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/mockAndSeedData";
import { isDatabaseAvailable } from "@/lib/db";
import { contarPendentes } from "@/lib/curadoria/curadoria";
import { erro, exigir, type UsuarioSessao } from "@/lib/auth/servidor";
import { podeAcessar, type Area } from "@/lib/auth/permissoes";

// Cada ação pertence a uma área; ação fora desta lista é recusada.
const AREA_DA_ACAO: Record<string, Area> = {
  SALVAR_PERGUNTA_FORMULARIO: "coleta",
  ADICIONAR_SECAO_FORMULARIO: "coleta",
  PUBLICAR_FORMULARIO: "coleta",
  CRIAR_FORMULARIO: "coleta",
  TOGGLE_ITEM_PUBLICACAO: "sistema",
  PUBLICAR_SELECAO_SITE: "sistema",
  RESOLVER_PROBLEMA_IMPORTACAO: "sistema",
  CONCLUIR_IMPORTACAO: "sistema",
};

/** Devolve só as coleções das áreas que o perfil enxerga. */
async function estadoVisivel(usuario: UsuarioSessao, extra: Record<string, unknown> = {}) {
  const store = getStore();
  const coleta = podeAcessar(usuario.areas, "coleta");
  const sistema = podeAcessar(usuario.areas, "sistema");
  return NextResponse.json(
    {
      ...extra,
      dbConnected: await isDatabaseAvailable(),
      ...(coleta && {
        pendentesRevisao: await contarPendentes(),
        formularios: store.formularios,
      }),
      ...(sistema && {
        publicacaoItens: store.publicacaoItens,
        ultimaPublicacao: store.ultimaPublicacao,
        metodoPublicacao: store.metodoPublicacao,
        problemasImportacao: store.problemasImportacao,
        importacaoConcluida: store.importacaoConcluida,
      }),
    },
    { headers: { "cache-control": "no-store" } }
  );
}

function formatNowShort(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

export async function GET(request: NextRequest) {
  const g = await exigir(request, ["coleta", "sistema"]);
  if (g.resposta) return g.resposta;
  return estadoVisivel(g.usuario);
}

export async function POST(request: NextRequest) {
  const g = await exigir(request, ["coleta", "sistema"]);
  if (g.resposta) return g.resposta;
  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  const area = AREA_DA_ACAO[action];
  if (!area) return erro(400, "Ação desconhecida.");
  if (!podeAcessar(g.usuario.areas, area)) return erro(403, "Seu perfil não tem acesso a esta área.");
  // Autor vem da sessão; campos "usuario"/"usuarioUuid" do corpo são ignorados.
  const usuario = g.usuario.nome;
  const store = getStore();
  const nowShort = formatNowShort();

  switch (action) {
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
      break;
    }
  }

  return estadoVisivel(g.usuario, { ok: true });
}
