"use client";

import React from "react";
import { CircleDollarSign } from "lucide-react";
import { AnalisePagina, Barras, BarrasFatias, CARTAO, Cartao, Etiquetas, reais } from "@/components/analises";
import { useApp } from "@/context/AppContext";
import type { Fatia } from "@/lib/paineis-types";

const maior = (fatias: Fatia[]) => [...fatias].sort((a, b) => b.n - a.n)[0];
/** "Até 2 Salários Mínimos (até R$ ...)" -> "Até 2 Salários Mínimos" */
const curto = (s: string) => s.replace(/\s*\(.*\)$/, "");

export default function ImpactoEconomicoPage() {
  const { paineis } = useApp();
  const eco = paineis.impacto;
  const renda = maior(eco.renda.filter((f) => !f.rotulo.startsWith("Prefiro")));
  const antecedencia = maior(eco.antecedencia.filter((f) => !f.rotulo.startsWith("Não sei")));
  const teto = Math.max(1, ...eco.gastoPorRenda.map((g) => g.valor));

  return (
    <AnalisePagina
      trilha="Impacto econômico"
      titulo="Impacto econômico e hospitalidade"
      subtitulo="Renda, gastos e hábitos de reserva, hospedagem e alimentação."
      icone={<CircleDollarSign className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#182657] text-white rounded-xl p-5 shadow-xs">
          <div className="text-xs text-slate-300 font-medium">Gasto médio diário</div>
          <div className="text-3xl font-extrabold tracking-tight mt-1.5">{reais(eco.gastoDiarioMedio)}</div>
          <div className="text-xs text-slate-300 mt-1.5">média de {eco.respostasGasto} respostas</div>
        </div>
        <div className={CARTAO}>
          <div className="text-xs text-slate-500 font-medium">Renda familiar mais comum</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5">{renda ? curto(renda.rotulo) : "—"}</div>
          {renda && <div className="text-xs text-slate-500 mt-1.5">{renda.percentual}% das respostas</div>}
        </div>
        <div className={CARTAO}>
          <div className="text-xs text-slate-500 font-medium">Antecedência mais comum</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5">
            {antecedencia ? curto(antecedencia.rotulo) : "—"}
          </div>
          {antecedencia && <div className="text-xs text-slate-500 mt-1.5">{antecedencia.percentual}% das respostas</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Cartao titulo="Gasto diário × renda familiar" nota="média por faixa">
          <Barras
            itens={eco.gastoPorRenda.map((g) => ({
              rotulo: curto(g.faixa),
              texto: reais(g.valor),
              largura: (g.valor / teto) * 100,
              detalhe: `${g.n} respostas`,
            }))}
          />
        </Cartao>
        <Cartao titulo="Antecedência da decisão">
          <BarrasFatias fatias={eco.antecedencia} />
        </Cartao>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cartao titulo="Tipo de hospedagem">
          <Etiquetas fatias={eco.hospedagem} />
        </Cartao>
        <Cartao titulo="Onde faz as refeições" nota="pode marcar mais de uma">
          <Etiquetas fatias={eco.refeicoes} />
        </Cartao>
      </div>
    </AnalisePagina>
  );
}
