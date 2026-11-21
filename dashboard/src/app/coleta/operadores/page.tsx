"use client";

import React, { useState } from "react";
import { UserCheck, CornerDownRight } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function OperadoresPage() {
  const { operadores, dispatchAction, canManageUsers, canEdit, showToast } =
    useApp();

  const [periodo, setPeriodo] = useState("Últimos 30 dias");
  const [selectedId, setSelectedId] = useState<string>("op-1");
  const [showNewModal, setShowNewModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoLocal, setNovoLocal] = useState("Thermas dos Laranjais");

  const selectedOp =
    operadores.find((o) => o.id === selectedId) || operadores[0];

  const handleResetCode = async (id: string) => {
    await dispatchAction("REDEFINIR_CODIGO_OPERADOR", { id });
    showToast("Código do operador redefinido e registrado na Auditoria!");
  };

  const handleToggleActive = async (id: string) => {
    await dispatchAction("ALTERNAR_STATUS_OPERADOR", { id });
    showToast("Status do operador atualizado!");
  };

  const handleCreateOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await dispatchAction("CRIAR_OPERADOR", {
      nome: novoNome.trim(),
      localHabitual: novoLocal,
    });
    setNovoNome("");
    setShowNewModal(false);
    showToast("Novo operador cadastrado e código individual gerado!");
  };

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Operadores">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Operadores
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Desempenho da equipe de campo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-2xs">
            <span className="text-slate-400 mr-1">⌄Período:</span>
            <select
              aria-label="Período"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Últimos 7 dias">Últimos 7 dias</option>
              <option value="Ano 2026">Ano 2026</option>
            </select>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold shadow-2xs transition"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Novo operador</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">12</div>
          <div className="text-xs text-slate-500 mt-1.5">operadores ativos</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">1.874</div>
          <div className="text-xs text-slate-500 mt-1.5">
            pesquisas no período
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">5,6%</div>
          <div className="text-xs text-slate-500 mt-1.5">
            taxa média de alerta
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">4</div>
          <div className="text-xs text-slate-500 mt-1.5">
            com envio pendente
          </div>
        </div>
      </div>

      {/* Ranking de coletas + Card de detalhe do operador */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Ranking de coletas
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2">Operador</th>
                  <th className="py-2">Código</th>
                  <th className="py-2" colSpan={2}>
                    Coletas
                  </th>
                  <th className="py-2">Taxa de alerta</th>
                  <th className="py-2">Último envio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {operadores.map((op) => {
                  const isSelected = op.id === selectedOp?.id;
                  const [prefix, num] = op.codigo.split("-");
                  return (
                    <tr
                      key={op.id}
                      onClick={() => setSelectedId(op.id)}
                      className={`cursor-pointer transition text-[#182657] ${
                        isSelected ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="py-3.5 font-medium">
                        {op.nome}
                        {!op.ativo && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs leading-tight">
                          {prefix}-
                          <br />
                          {num}
                        </span>
                      </td>
                      <td className="py-3.5 font-extrabold w-14">
                        {op.coletas30Dias}
                      </td>
                      <td className="py-3.5 w-36 pr-4">
                        <div
                          style={{
                            width: `${Math.max(
                              18,
                              (op.coletas30Dias / 420) * 100
                            )}%`,
                          }}
                          className="h-3 rounded-full bg-[#008767]"
                        />
                      </td>
                      <td className="py-3.5">
                        <div>
                          {op.taxaAlerta.toFixed(1).replace(".", ",")}%
                        </div>
                        {op.taxaAlerta > 10 && (
                          <span className="inline-block px-2 py-0.2 rounded-full bg-[#fef08a] text-amber-950 text-[10px] font-bold">
                            alta
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {op.statusEnvio === "offline" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                            {op.ultimoEnvio}
                          </span>
                        ) : (
                          <span>{op.ultimoEnvio}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhe do operador selecionado */}
        {selectedOp && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-slate-900">
                {selectedOp.nome} ·
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                {selectedOp.codigo}
              </span>
            </div>

            <div className="text-xs text-slate-500 mb-5">
              Local habitual: {selectedOp.localHabitual}
            </div>

            {/* Mini gráfico de barras diárias */}
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 border-b border-slate-200 pb-1 mb-2">
              {selectedOp.serieDiaria.map((v, idx) => (
                <div
                  key={idx}
                  style={{ height: `${Math.max(15, (v / 20) * 100)}%` }}
                  className="w-full rounded-t bg-[#008767]"
                />
              ))}
            </div>

            <div className="text-xs text-slate-500 mb-4">
              Média: {selectedOp.mediaDiaria} coletas por dia
            </div>

            {(canManageUsers || canEdit) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetCode(selectedOp.id)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition"
                >
                  Redefinir código
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(selectedOp.id)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition"
                >
                  {selectedOp.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo Operador */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar novo operador (UC12)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Gera automaticamente o código de 6 caracteres (ex.: OTO-XXX) para
              autenticação no aplicativo mobile.
            </p>
            <form onSubmit={handleCreateOp} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="novo-op-nome"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Nome completo do pesquisador
                </label>
                <input
                  id="novo-op-nome"
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Lucas Ferreira"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="novo-op-local"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Local habitual de coleta
                </label>
                <select
                  id="novo-op-local"
                  value={novoLocal}
                  onChange={(e) => setNovoLocal(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="Thermas dos Laranjais">
                    Thermas dos Laranjais
                  </option>
                  <option value="Hot Beach">Hot Beach</option>
                  <option value="Praça da Matriz">Praça da Matriz</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold"
                >
                  Cadastrar e gerar código
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
