"use client";

import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function ImportacaoPage() {
  const {
    problemasImportacao,
    importacaoConcluida,
    dispatchAction,
    exportToExcel,
    canEdit,
    showToast,
  } = useApp();

  const [arquivoNome, setArquivoNome] = useState("demanda_2024.xlsx");
  const [linhasValidas, setLinhasValidas] = useState(3412);
  const [linhasDuplicadas, setLinhasDuplicadas] = useState(112);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNome(file.name);
    setLinhasValidas(3412);
    setLinhasDuplicadas(112);
    showToast(`Planilha "${file.name}" carregada para pré-visualização!`);
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modeloRows = [
      {
        Data_Coleta: "2024-10-15",
        UF_Origem: "SP",
        Cidade_IBGE: "Ribeirão Preto",
        Pernoites: 3,
        Meio_Transporte: "Veículo próprio",
        Hospedagem: "Hotéis",
        Gasto_Diario_BRL: 350,
        NPS_0_10: 9,
        Idade: 38,
        Genero: "Feminino",
      },
    ];
    exportToExcel("Modelo_OTO", modeloRows, "OTO_Modelo_Importacao.xlsx");
  };

  const handleResolverProblema = async (id: number, acaoTexto: string) => {
    if (!canEdit) return;
    await dispatchAction("RESOLVER_PROBLEMA_IMPORTACAO", { id });
    showToast(`Ação aplicada: ${acaoTexto}`);
  };

  const handleConcluirImportacao = async () => {
    if (!canEdit) return;
    await dispatchAction("CONCLUIR_IMPORTACAO", { arquivoNome });
    showToast(
      `Importação de ${arquivoNome} concluída com sucesso e registrada na Auditoria!`
    );
  };

  const pendentesCount = problemasImportacao.filter((p) => !p.resolvido).length;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Importação de planilhas">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Importação
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traga as bases históricas em Excel sem duplicar registros.
          </p>
        </div>
      </div>

      {/* Área de Drag & Drop (.xlsx) */}
      <div className="bg-white border-2 border-dashed border-slate-300 hover:border-[#008767] rounded-xl p-8 text-center transition mb-5">
        <input
          id="upload-planilha-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-slate-600 cursor-pointer hover:text-[#008767]"
        >
          <span className="font-bold text-slate-800">
            Arraste a planilha aqui
          </span>{" "}
          ou escolha o arquivo
        </button>
        <div className="text-xs text-slate-500 mt-1">
          .xlsx ·{" "}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="underline hover:text-[#008767]"
          >
            modelo de colunas disponível para download
          </button>
        </div>
      </div>

      {/* Card de Prévia · demanda_2024.xlsx */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Prévia · {arquivoNome}
        </h2>

        {/* Badges de resumo da carga */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
            {linhasValidas.toLocaleString("pt-BR")} linhas válidas
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-xs font-semibold">
            {pendentesCount === 0 ? "0" : "38"} com problema
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
            {linhasDuplicadas} já existentes (serão ignoradas)
          </span>
        </div>

        {/* Tabela de problemas por linha */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                <th className="py-2.5 w-24">Linha</th>
                <th className="py-2.5">Problema</th>
                <th className="py-2.5 w-64">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {problemasImportacao.map((p) => (
                <tr key={p.id} className="text-[#182657]">
                  <td className="py-3.5">{p.linha}</td>
                  <td className="py-3.5">{p.problema}</td>
                  <td className="py-3.5">
                    {p.resolvido ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
                        ✓ {p.resolucao || p.acaoTexto}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() =>
                          handleResolverProblema(p.id, p.acaoTexto)
                        }
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition"
                      >
                        {p.acaoTexto}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barra inferior amarela com Concluir importação */}
        <div className="bg-[#fefce8] border border-[#fde047] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-800">
            <span>
              Regra para dados inválidos:{" "}
              <span className="font-bold text-[#182657]">
                corrigir antes de concluir
              </span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-[11px] font-semibold">
              a validar
            </span>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleConcluirImportacao}
              className="px-4 py-2 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold transition shrink-0"
            >
              {importacaoConcluida
                ? "Importação concluída ✓"
                : "Concluir importação"}
            </button>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
