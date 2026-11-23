"use client";

import React from "react";
import { Compass } from "lucide-react";
import { AnalisePagina, BarrasFatias, Cartao, corDaNota, decimal, Etiquetas, SemDados } from "@/components/analises";
import { useApp } from "@/context/AppContext";

export default function AtracoesPage() {
  const { paineis } = useApp();
  const at = paineis.atracoes;
  const maxVisitas = Math.max(1, ...at.atrativos.map((a) => a.avaliacoes));

  return (
    <AnalisePagina
      trilha="Atrações"
      titulo="Atrações e mobilidade em Olímpia"
      subtitulo="Popularidade das atrações, avaliações e logística de chegada."
      icone={<Compass className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <Cartao titulo="Popularidade × avaliação" nota="avaliações recebidas × nota (1 a 5)" className="lg:col-span-7">
          {at.atrativos.length ? (
            <div className="relative h-56 border-l border-b border-slate-300 mx-2 my-2" aria-hidden="true">
              {at.atrativos.map((a) => (
                <div
                  key={a.nome}
                  style={{
                    left: `${4 + (a.avaliacoes / maxVisitas) * 90}%`,
                    top: `${94 - ((a.nota - 1) / 4) * 88}%`,
                    borderColor: corDaNota(a.nota),
                  }}
                  title={`${a.nome}: nota ${decimal(a.nota)} (${a.avaliacoes} avaliações)`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 bg-white"
                />
              ))}
            </div>
          ) : (
            <SemDados />
          )}
          <p className="text-xs text-slate-500 mt-3">
            Alta visitação e alta nota (canto superior direito): manter. Baixa nota com alta visitação: corrigir.
          </p>
        </Cartao>

        <Cartao titulo="Atrações mais bem avaliadas" nota="nota · avaliações" className="lg:col-span-5">
          {at.atrativos.length ? (
            <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
              {at.atrativos.map((a) => (
                <div key={a.nome} className="py-2.5 flex items-center justify-between gap-3 text-sm text-[#182657]">
                  <span className="font-medium">{a.nome}</span>
                  <span className="flex gap-4 shrink-0">
                    <b>{decimal(a.nota)}</b>
                    <span className="text-slate-500 w-10 text-right">{a.avaliacoes}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <SemDados />
          )}
        </Cartao>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cartao titulo="Meio principal para chegar">
          <BarrasFatias fatias={at.transporte} />
        </Cartao>
        <Cartao titulo="Do aeroporto até Olímpia" nota="só quem veio de avião">
          <Etiquetas fatias={at.aeroporto} />
        </Cartao>
      </div>
    </AnalisePagina>
  );
}
