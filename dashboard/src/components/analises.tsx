"use client";

import React from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";
import type { Fatia } from "@/lib/paineis-types";

export const CARTAO = "bg-white border border-slate-200 rounded-xl p-5 shadow-2xs";

export const reais = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const decimal = (v: number) => v.toFixed(1).replace(".", ",");

/** Nota de 1 a 5: verde a partir de 4, âmbar a partir de 3, vermelho abaixo da meta. */
export function corDaNota(nota: number): string {
  if (nota < 3) return "#c84b31";
  return nota < 4 ? "#d97706" : "#008767";
}

export function AnalisePagina({
  trilha,
  titulo,
  subtitulo,
  icone,
  children,
}: {
  trilha: string;
  titulo: string;
  subtitulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  const { erroAnalises } = useApp();
  return (
    <SidebarLayout breadcrumb={`Inteligência turística / Análises · ${trilha}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            {icone}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{titulo}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <AnalyticsHeaderActions abaTitulo={titulo} />
      </div>
      <FilterBar />
      {erroAnalises && (
        <div role="alert" className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-xs text-rose-800">
          {erroAnalises}
        </div>
      )}
      {children}
    </SidebarLayout>
  );
}

export function Cartao({
  titulo,
  nota,
  className = "",
  children,
}: {
  titulo: string;
  nota?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARTAO} ${className}`}>
      <div className="flex flex-wrap items-baseline gap-1.5 mb-4">
        <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
        {nota && <span className="text-xs text-slate-500">· {nota}</span>}
      </div>
      {children}
    </section>
  );
}

export function SemDados() {
  return <p className="text-xs text-slate-500">Sem respostas neste recorte.</p>;
}

export interface BarraItem {
  rotulo: string;
  texto: string;
  /** 0 a 100 */
  largura: number;
  cor?: string;
  detalhe?: string;
}

export function Barras({ itens }: { itens: BarraItem[] }) {
  if (!itens.length) return <SemDados />;
  return (
    <div className="space-y-2.5 text-xs">
      {itens.map((i) => (
        <div key={i.rotulo} className="grid grid-cols-12 items-center gap-2" title={i.detalhe}>
          <div className="col-span-5 text-slate-600 break-words">{i.rotulo}</div>
          <div className="col-span-5 bg-slate-100 h-3.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(100, Math.max(0, i.largura))}%`, backgroundColor: i.cor ?? "#008767" }}
              className="h-full rounded-full"
            />
          </div>
          <div className="col-span-2 text-right font-bold text-slate-900">{i.texto}</div>
        </div>
      ))}
    </div>
  );
}

export function BarrasFatias({ fatias, limite = 8 }: { fatias: Fatia[]; limite?: number }) {
  return (
    <Barras
      itens={fatias.slice(0, limite).map((f) => ({
        rotulo: f.rotulo,
        texto: `${f.percentual}%`,
        largura: f.percentual,
        detalhe: `${f.n} respostas`,
      }))}
    />
  );
}

export function Etiquetas({ fatias }: { fatias: Fatia[] }) {
  if (!fatias.length) return <SemDados />;
  return (
    <div className="flex flex-wrap gap-2">
      {fatias.map((f) => (
        <span
          key={f.rotulo}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800"
        >
          {f.rotulo} {f.percentual}%
        </span>
      ))}
    </div>
  );
}
