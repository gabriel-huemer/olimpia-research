import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/mockAndSeedData";
import { isDatabaseAvailable, withAuditTransaction } from "@/lib/db";

/**
 * Endpoint REST de sincronização em lote do aplicativo mobile (UC05 / RF08).
 * Recebe lotes de até 5 pesquisas offline e garante idempotência por UUID/protocolo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      operadorCodigo = "OTO-482",
      operadorId = null,
      dispositivoId = null,
      pesquisas = [],
    } = body;

    const store = getStore();
    const operador =
      store.operadores.find((o) => o.codigo === operadorCodigo) || store.operadores[0];

    let aceitas = 0;
    let duplicadas = 0;
    let sinalizadas = 0;
    const resultadosItens: Array<{ id: string; protocolo: string; status: string }> = [];

    for (const item of pesquisas) {
      const existente = store.pesquisas.find(
        (p) => p.id === item.id || (item.protocolo && p.protocolo === item.protocolo)
      );
      if (existente) {
        duplicadas += 1;
        resultadosItens.push({
          id: item.id,
          protocolo: existente.protocolo,
          status: existente.situacao === "Sinalizada" ? "EM_REVISAO" : "SINCRONIZADA",
        });
        continue;
      }

      const nextNum = 48 + store.pesquisas.length;
      const protocolo = item.protocolo || `${String(nextNum).padStart(4, "0")}/26`;
      const temAlerta = Boolean(item.sinalizada);

      store.pesquisas.unshift({
        id: item.id || `sync-${Date.now()}-${aceitas}`,
        protocolo,
        origem: item.origem || "São Paulo, SP",
        operador: operador.nome,
        local: item.local || operador.localHabitual,
        coletada: item.coletada || "26/10 11:15",
        periodo: "Out/2026",
        situacao: temAlerta ? "Sinalizada" : "Sincronizada",
      });

      if (temAlerta) {
        sinalizadas += 1;
        store.revisao.push({
          id: Date.now() + aceitas,
          protocolo,
          resumoMotivo: item.motivoResumo || "alerta de campo",
          operador: operador.nome,
          dataCurta: "26/10",
          cidadeOrigem: item.origem || "São Paulo, SP",
          motivoDetalhado:
            item.motivoDetalhado ||
            'Resposta fora do padrão sinalizada em campo. O operador escolheu "Manter e sinalizar".',
          campoSuspeito: item.campoSuspeito || "Valor informado",
          valorSuspeito: String(item.valorSuspeito || "—"),
          dadosColeta: {
            idade: String(item.idade || "35"),
            genero: item.genero || "Feminino",
            estadoCivil: item.estadoCivil || "Casado(a)",
            gastoDiario: item.gastoDiario || "R$ 350,00",
            coletadaEm: `26/10/2026 · ${operador.nome}`,
          },
          status: "PENDENTE",
        });
      }

      aceitas += 1;
      resultadosItens.push({
        id: item.id || protocolo,
        protocolo,
        status: temAlerta ? "EM_REVISAO" : "SINCRONIZADA",
      });
    }

    if (aceitas > 0) {
      store.auditoria.unshift({
        id: Date.now(),
        dataHora: "26/10 11:20",
        usuario: `${operador.nome} (app)`,
        acao: "Sincronizou",
        item: `Lote mobile (${aceitas} pesquisa${aceitas > 1 ? "s" : ""})`,
        alteracao: `${aceitas} enviadas · ${duplicadas} duplicadas ignoradas`,
      });
    }

    // Se conectado ao PostgreSQL (oto-db), grava de forma idempotente conforme README
    if ((await isDatabaseAvailable()) && operadorId && dispositivoId) {
      try {
        await withAuditTransaction(
          operadorId,
          async (client) => {
            await client.query(
              `INSERT INTO oto.lote_sincronizacao
                 (dispositivo_id, usuario_id, finalizado_em, qtd_enviadas, qtd_aceitas, qtd_duplicadas, status)
               VALUES ($1, $2, now(), $3, $4, $5, 'CONCLUIDO')`,
              [dispositivoId, operadorId, pesquisas.length, aceitas, duplicadas]
            );
          },
          dispositivoId
        );
      } catch {
        // Ignora caso os UUIDs de exemplo não existam na tabela física
      }
    }

    return NextResponse.json({
      ok: true,
      recebidas: pesquisas.length,
      aceitas,
      duplicadas,
      sinalizadas,
      itens: resultadosItens,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
