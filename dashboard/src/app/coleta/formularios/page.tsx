"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, CornerDownRight } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function FormulariosListaPage() {
  const { formularios, dispatchAction, canEdit, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaVigencia, setNovaVigencia] = useState("não definida");

  const filtered = formularios.filter((f) => {
    const matchStatus = statusFilter === "Todos" || f.status === statusFilter;
    const matchSearch =
      !search || f.nome.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await dispatchAction("CRIAR_FORMULARIO", {
      nome: novoNome.trim(),
      vigencia: novaVigencia,
    });
    setNovoNome("");
    setShowNewModal(false);
    showToast("Rascunho de formulário criado com sucesso!");
  };

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Formulários (lista)">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Formulários
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie, edite e publique as pesquisas que os operadores aplicam em
              campo.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#182657] hover:bg-[#23366e] text-white text-xs font-semibold transition"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Novo formulário</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Status:</span>
          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Encerrada">Encerrada</option>
            <option value="Rascunho">Rascunho</option>
            <option value="Agendado">Agendado</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar formulário..."
            className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-44"
          />
        </div>
      </div>

      {/* Tabela de formulários */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                <th className="py-2.5">Formulário</th>
                <th className="py-2.5">Versão</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Respostas</th>
                <th className="py-2.5">Vigência</th>
                <th className="py-2.5">Atualizado</th>
                <th className="py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((f) => {
                const badgeStyle =
                  f.status === "Ativo"
                    ? "bg-emerald-50 text-emerald-800"
                    : f.status === "Encerrada"
                    ? "bg-slate-100 text-slate-600"
                    : f.status === "Rascunho"
                    ? "bg-[#fef08a] text-amber-950"
                    : "bg-blue-50 text-blue-800";

                return (
                  <tr key={f.id} className="text-[#182657]">
                    <td className="py-4 font-bold">{f.nome}</td>
                    <td className="py-4">{f.versao}</td>
                    <td className="py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyle}`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-4">
                      {f.respostas.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-4">{f.vigencia}</td>
                    <td className="py-4">{f.atualizado}</td>
                    <td className="py-4 text-right">
                      <Link
                        href="/coleta/formularios/editor"
                        className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800"
                      >
                        {f.status === "Encerrada" || !canEdit ? "Ver" : "Editar"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa azul no rodapé */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl px-4 py-3 text-xs text-[#182657]">
        Formulário ativo é o que aparece no app do pesquisador. Só um por
        pesquisa. Duplicar uma versão cria um rascunho.
      </div>

      {/* Modal de novo formulário */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Novo formulário de pesquisa
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cria um novo rascunho clonando a estrutura padrão de seções do OTO.
            </p>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Nome do formulário
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Pesquisa de Eventos Turísticos"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Vigência inicial
                </label>
                <input
                  type="text"
                  value={novaVigencia}
                  onChange={(e) => setNovaVigencia(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold"
                >
                  Criar rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
