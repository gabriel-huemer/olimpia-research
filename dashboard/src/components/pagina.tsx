"use client";

import React from "react";
import { SidebarLayout } from "@/components/SidebarLayout";

export const BOTAO = "px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50";
export const BOTAO_VERDE = `${BOTAO} bg-[#008767] hover:bg-[#006e54] text-white`;
export const BOTAO_AZUL = `${BOTAO} bg-[#182657] hover:bg-[#23366e] text-white`;
export const BOTAO_CLARO = `${BOTAO} bg-white hover:bg-slate-50 border border-slate-200 text-slate-800`;
export const BOTAO_PERIGO = `${BOTAO} bg-white hover:bg-rose-50 border border-rose-200 text-rose-800`;
export const CAMPO =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#008767]";
export const ROTULO = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1";
export const CAIXA = "bg-white border border-slate-200 rounded-xl p-5 shadow-2xs";

/** Cabeçalho padrão das telas de Coleta e Sistema. */
export function Pagina({
  titulo,
  subtitulo,
  icone,
  acoes,
  erro,
  children,
}: {
  titulo: string;
  subtitulo: string;
  icone: React.ReactNode;
  acoes?: React.ReactNode;
  erro?: string | null;
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout breadcrumb={`Inteligência turística / ${titulo}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            {icone}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{titulo}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">{acoes}</div>
      </div>
      {erro && <Aviso>{erro}</Aviso>}
      {children}
    </SidebarLayout>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-xs text-rose-800">
      {children}
    </div>
  );
}

export interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

export function Seletor({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: Array<OpcaoFiltro | string>;
  aoMudar: (v: string) => void;
}) {
  return (
    <label className="flex max-w-full items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
      <span className="text-slate-500 mr-1">{rotulo}:</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="min-w-0 font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
      >
        {opcoes.map((o) => {
          const op = typeof o === "string" ? { valor: o, rotulo: o } : o;
          return (
            <option key={op.valor} value={op.valor}>
              {op.rotulo}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Busca({ valor, aoMudar, texto }: { valor: string; aoMudar: (v: string) => void; texto: string }) {
  return (
    <input
      type="search"
      aria-label={texto}
      placeholder={texto}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-2xs w-full sm:w-52 focus:outline-none focus:border-[#008767]"
    />
  );
}

export function Tabela({ colunas, children }: { colunas: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
            {colunas.map((c) => (
              <th key={c} scope="col" className="py-2.5 pr-4">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm text-[#182657]">{children}</tbody>
      </table>
    </div>
  );
}

export function Codigo({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold">{children}</span>;
}

const CORES = {
  verde: "bg-emerald-50 text-emerald-800",
  azul: "bg-blue-50 text-blue-800",
  amarelo: "bg-[#fef08a] text-amber-950",
  cinza: "bg-slate-100 text-slate-700",
  vermelho: "bg-rose-100 text-rose-800",
};
export type Cor = keyof typeof CORES;

export function Selo({ cor, children }: { cor: Cor; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${CORES[cor]}`}>
      {children}
    </span>
  );
}

export function Janela({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-base font-bold text-slate-900 mb-3">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
