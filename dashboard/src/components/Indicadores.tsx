import React from "react";
import { Barras, CARTAO } from "@/components/analises";
import type { IndicadorPublico } from "@/lib/publicacao/publicacao";

/** Desenho dos indicadores públicos: o mesmo no site e na pré-visualização. */
export function Indicadores({ lista }: { lista: IndicadorPublico[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {lista.map((i) => (
        <section key={i.codigo} className={CARTAO}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">{i.titulo}</h2>
          {i.series.length === 1 && i.series[0].largura === 0 ? (
            <div className="text-3xl font-extrabold text-[#182657]">
              {i.series[0].texto} <span className="text-xs font-medium text-slate-500">{i.series[0].rotulo}</span>
            </div>
          ) : (
            <Barras itens={i.series} />
          )}
        </section>
      ))}
    </div>
  );
}
