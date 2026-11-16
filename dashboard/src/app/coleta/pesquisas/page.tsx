"use client";

import React, { useState } from "react";
import { ClipboardList, Download, CornerDownRight } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function PesquisasPage() {
  const {
    pesquisas,
    formularios,
    dispatchAction,
    exportToExcel,
    canEdit,
    showToast,
  } = useApp();

  const [periodo, setPeriodo] = useState("Out/2026");
  const [operador, setOperador] = useState("Todos");
  const [situacao, setSituacao] = useState("Todas");
  const [local, setLocal] = useState("Todos");
  const [buscaProtocolo, setBuscaProtocolo] = useState("");

  // Modal de inserção manual (UC13 / RF17)
  const [showManualModal, setShowManualModal] = useState(false);
  const [origemManual, setOrigemManual] = useState("— (telefone)");
  const [localManual, setLocalManual] = useState("—");
  const [idadeManual, setIdadeManual] = useState("42");
  const [generoManual, setGeneroManual] = useState("Feminino");
  const [gastoManual, setGastoManual] = useState("380");

  const filtered = pesquisas.filter((p) => {
    if (operador !== "Todos" && p.operador !== operador) return false;
    if (situacao !== "Todas" && p.situacao !== situacao) return false;
    if (local !== "Todos" && p.local !== local) return false;
    if (
      buscaProtocolo &&
      !p.protocolo.toLowerCase().includes(buscaProtocolo.toLowerCase()) &&
      !p.origem.toLowerCase().includes(buscaProtocolo.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const rows = filtered.map((p) => ({
      Protocolo: p.protocolo,
      Origem: p.origem,
      Operador: p.operador,
      Local: p.local,
      Coletada: p.coletada,
      Situacao: p.situacao,
    }));
    exportToExcel("Pesquisas Coletadas", rows, "OTO_Pesquisas_Coletadas.xlsx");
  };

  const handleInsertManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatchAction("INSERIR_PESQUISA_MANUAL", {
      origem: origemManual,
      local: localManual,
      idade: idadeManual,
      genero: generoManual,
      gastoDiario: gastoManual,
      canalRecebimento: "telefone",
    });
    setShowManualModal(false);
    showToast("Resposta manual registrada com protocolo e gravada na Auditoria!");
  };

  const totalGeral =
    formularios.find((f) => f.status === "Ativo")?.respostas || 5012;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Pesquisas (respostas coletadas)">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Pesquisas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Todas as respostas coletadas, de campo e inseridas manualmente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Período:</span>
          <select
            aria-label="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Out/2026">Out/2026</option>
            <option value="Set/2026">Set/2026</option>
            <option value="Ano 2026">Ano 2026</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Operador:</span>
          <select
            aria-label="Operador"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Ana Souza">Ana Souza</option>
            <option value="Carlos Lima">Carlos Lima</option>
            <option value="Marina Alves">Marina Alves</option>
            <option value="Gestão (manual)">Gestão (manual)</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Situação:</span>
          <select
            aria-label="Situação"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todas">Todas</option>
            <option value="Na fila do app">Na fila do app</option>
            <option value="Sinalizada">Sinalizada</option>
            <option value="Sincronizada">Sincronizada</option>
            <option value="Aprovada">Aprovada</option>
            <option value="Inserida manualmente">Inserida manualmente</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Local:</span>
          <select
            aria-label="Local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Thermas dos Laranjais">Thermas dos Laranjais</option>
            <option value="Hot Beach">Hot Beach</option>
            <option value="Praça da Matriz">Praça da Matriz</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄</span>
          <input
            type="text"
            value={buscaProtocolo}
            onChange={(e) => setBuscaProtocolo(e.target.value)}
            placeholder="Buscar protocolo..."
            className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-36"
          />
        </div>
      </div>

      {/* Tabela de pesquisas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                <th className="py-2.5 px-2">Protocolo</th>
                <th className="py-2.5 px-2">Origem</th>
                <th className="py-2.5 px-2">Operador</th>
                <th className="py-2.5 px-2">Local</th>
                <th className="py-2.5 px-2">Coletada</th>
                <th className="py-2.5 px-2">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((p) => {
                const isSinalizada = p.situacao === "Sinalizada";
                const badgeClass =
                  p.situacao === "Na fila do app"
                    ? "bg-blue-50 text-blue-800"
                    : p.situacao === "Sinalizada"
                    ? "bg-[#fef08a] text-amber-950"
                    : p.situacao === "Sincronizada" || p.situacao === "Aprovada"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600";

                return (
                  <tr
                    key={p.id}
                    className={`text-[#182657] ${
                      isSinalizada ? "bg-[#fefce8]" : ""
                    }`}
                  >
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold">
                        {p.protocolo}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-medium">{p.origem}</td>
                    <td className="py-3.5 px-2">{p.operador}</td>
                    <td className="py-3.5 px-2">{p.local}</td>
                    <td className="py-3.5 px-2">{p.coletada}</td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                      >
                        {p.situacao}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé com contador e botão Inserir resposta manual */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Mostrando 1–{filtered.length} de{" "}
          {totalGeral.toLocaleString("pt-BR")} ·
        </span>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Inserir resposta manual</span>
          </button>
        )}
      </div>

      {/* Modal Inserir resposta manual (UC13 / RF17) */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Inserir resposta manual (UC13)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Registra uma pesquisa recebida por outro meio (ex.: telefone),
              gera número de protocolo e associa à sua autoria na auditoria.
            </p>

            <form onSubmit={handleInsertManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Origem / Canal
                </label>
                <input
                  type="text"
                  value={origemManual}
                  onChange={(e) => setOrigemManual(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Idade
                  </label>
                  <input
                    type="number"
                    value={idadeManual}
                    onChange={(e) => setIdadeManual(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Gênero
                  </label>
                  <select
                    value={generoManual}
                    onChange={(e) => setGeneroManual(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Gasto diário (R$)
                  </label>
                  <input
                    type="number"
                    value={gastoManual}
                    onChange={(e) => setGastoManual(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Local de referência
                  </label>
                  <input
                    type="text"
                    value={localManual}
                    onChange={(e) => setLocalManual(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold"
                >
                  Salvar pesquisa manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
