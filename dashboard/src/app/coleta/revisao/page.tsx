"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function RevisaoPage() {
  const { revisao, dispatchAction, canEdit, showToast } = useApp();

  const pendentes = revisao.filter((r) => r.status === "PENDENTE");
  const [selectedId, setSelectedId] = useState<number>(pendentes[0]?.id || 1);
  const [novoValor, setNovoValor] = useState("50");
  const [motivo, setMotivo] = useState(
    "Erro de digitação confirmado com o operador"
  );
  const [showAllQueue, setShowAllQueue] = useState(false);

  const itemAtual =
    pendentes.find((p) => p.id === selectedId) || pendentes[0] || null;

  useEffect(() => {
    if (itemAtual) {
      if (itemAtual.protocolo === "0038/26") {
        setNovoValor("50");
        setMotivo("Erro de digitação confirmado com o operador");
      } else if (itemAtual.protocolo === "0045/26") {
        setNovoValor("Família com crianças");
        setMotivo("Grupo corrigido conforme acompanhantes informados");
      } else if (itemAtual.protocolo === "0040/26") {
        setNovoValor("R$ 850,00");
        setMotivo("Zero extra digitado em campo");
      } else {
        setNovoValor("30");
        setMotivo("Valor verificado pela coordenação OTO");
      }
    }
  }, [itemAtual]);

  const handleDecision = async (decisao: "APROVAR" | "CORRIGIR" | "EXCLUIR") => {
    if (!itemAtual || !canEdit) return;
    if ((decisao === "CORRIGIR" || decisao === "EXCLUIR") && !motivo.trim()) {
      showToast("Informe o motivo para registrar na trilha de auditoria (RF19).");
      return;
    }

    await dispatchAction("CURAR_RESPOSTA", {
      id: itemAtual.id,
      decisao,
      novoValor,
      motivo,
    });

    const msgMap = {
      APROVAR: `Pesquisa ${itemAtual.protocolo} aprovada como está!`,
      CORRIGIR: `Pesquisa ${itemAtual.protocolo} corrigida para "${novoValor}" e registrada na Auditoria!`,
      EXCLUIR: `Pesquisa ${itemAtual.protocolo} excluída logicamente e registrada na Auditoria!`,
    };
    showToast(msgMap[decisao]);
  };

  const visibleQueue = showAllQueue ? pendentes : pendentes.slice(0, 4);
  const remainingCount = Math.max(0, pendentes.length - 4);

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Revisão de respostas sinalizadas">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Revisão
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {pendentes.length} respostas aguardam decisão.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Coluna esquerda: FILA (MAIS ANTIGAS PRIMEIRO) */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            FILA (MAIS ANTIGAS PRIMEIRO)
          </div>

          {visibleQueue.map((item) => {
            const isSelected = itemAtual?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left bg-white rounded-xl p-3.5 transition border ${
                  isSelected
                    ? "border-2 border-[#008767] shadow-2xs"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono font-bold">
                    {item.protocolo}
                  </span>
                  <span className="font-semibold text-[#182657]">
                    · {item.resumoMotivo}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {item.operador} · {item.dataCurta}
                </div>
              </button>
            );
          })}

          {!showAllQueue && remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllQueue(true)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-1 pt-1 block"
            >
              + {remainingCount} outras
            </button>
          )}
        </div>

        {/* Coluna direita: Detalhe da pesquisa + Correção */}
        <div className="lg:col-span-8 space-y-4">
          {itemAtual ? (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                  <span>Pesquisa</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs">
                    {itemAtual.protocolo}
                  </span>
                  <span>· {itemAtual.cidadeOrigem}</span>
                </div>

                {/* Alerta amarelo com o motivo */}
                <div className="bg-[#fefce8] border border-[#fde047] rounded-lg px-4 py-2.5 text-xs text-slate-800 mb-4">
                  <span className="font-bold text-slate-900">
                    {itemAtual.motivoDetalhado.split(".")[0]}.
                  </span>
                  {itemAtual.motivoDetalhado.slice(
                    itemAtual.motivoDetalhado.indexOf(".") + 1
                  )}
                </div>

                {/* Tabela de campos da coleta */}
                <div className="divide-y divide-slate-200 text-sm mb-5">
                  <div className="py-3 grid grid-cols-12 items-center">
                    <div className="col-span-4 text-slate-500">Idade</div>
                    <div className="col-span-8">
                      <span
                        className={
                          itemAtual.campoSuspeito === "Idade"
                            ? "px-1.5 py-0.5 rounded bg-[#fef08a] text-[#182657] font-extrabold"
                            : "text-[#182657] font-medium"
                        }
                      >
                        {itemAtual.dadosColeta.idade}
                      </span>
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-12 items-center">
                    <div className="col-span-4 text-slate-500">Gênero</div>
                    <div className="col-span-8 text-[#182657] font-medium">
                      {itemAtual.dadosColeta.genero}
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-12 items-center">
                    <div className="col-span-4 text-slate-500">Estado civil</div>
                    <div className="col-span-8 text-[#182657] font-medium">
                      {itemAtual.dadosColeta.estadoCivil}
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-12 items-center">
                    <div className="col-span-4 text-slate-500">Gasto diário</div>
                    <div className="col-span-8 text-[#182657] font-medium">
                      <span
                        className={
                          itemAtual.campoSuspeito === "Gasto diário"
                            ? "px-1.5 py-0.5 rounded bg-[#fef08a] text-[#182657] font-extrabold"
                            : ""
                        }
                      >
                        {itemAtual.dadosColeta.gastoDiario}
                      </span>
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-12 items-center">
                    <div className="col-span-4 text-slate-500">Coletada</div>
                    <div className="col-span-8 text-[#182657] font-medium">
                      {itemAtual.dadosColeta.coletadaEm}
                    </div>
                  </div>
                </div>

                {/* Botões de decisão (UC08 / RF19) */}
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDecision("APROVAR")}
                      className="px-4 py-2.5 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold transition"
                    >
                      Aprovar como está
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision("CORRIGIR")}
                      className="px-4 py-2.5 rounded-lg bg-[#182657] hover:bg-[#23366e] text-white text-xs font-semibold transition"
                    >
                      Corrigir valor
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision("EXCLUIR")}
                      className="px-4 py-2.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold transition"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Card inferior: Correção */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
                <h2 className="text-sm font-bold text-slate-900">Correção</h2>

                <div>
                  <label
                    htmlFor="revisao-novo-valor"
                    className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    NOVO VALOR DA {itemAtual.campoSuspeito.toUpperCase()}
                  </label>
                  <input
                    id="revisao-novo-valor"
                    type="text"
                    value={novoValor}
                    disabled={!canEdit}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="revisao-motivo"
                    className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    MOTIVO (FICA NA AUDITORIA)
                  </label>
                  <input
                    id="revisao-motivo"
                    type="text"
                    value={motivo}
                    disabled={!canEdit}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Todas as respostas sinalizadas foram revisadas!
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
