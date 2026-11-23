"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { AnalisePagina, Barras, BarrasFatias, Cartao, corDaNota, decimal, Etiquetas, SemDados } from "@/components/analises";
import { useApp } from "@/context/AppContext";

const META = 3;

export default function InfraestruturaPage() {
  const { paineis } = useApp();
  const inf = paineis.infraestrutura;
  const fracos = [...inf.servicos].filter((s) => s.nota < META).sort((a, b) => a.nota - b.nota);

  return (
    <AnalisePagina
      trilha="Infraestrutura"
      titulo="Infraestrutura urbana e serviços"
      subtitulo="Qualidade dos serviços, acessibilidade e oportunidades de melhoria."
      icone={<Building2 className="w-5 h-5" />}
    >
      <Cartao
        titulo="Avaliação detalhada dos serviços da cidade"
        nota="nota média de 1 a 5 (Ótimo 5, Regular 3, Ruim 1) · meta 3,0"
        className="mb-4"
      >
        <Barras
          itens={inf.servicos.map((s) => ({
            rotulo: s.nome,
            texto: decimal(s.nota),
            largura: (s.nota / 5) * 100,
            cor: corDaNota(s.nota),
            detalhe: `${s.avaliacoes} avaliações`,
          }))}
        />
        {fracos.length > 0 && (
          <div className="mt-4 bg-[#fefce8] border border-[#fde047] rounded-lg px-4 py-2.5 text-xs text-slate-800">
            Abaixo da meta: {fracos.map((s) => `${s.nome} (${decimal(s.nota)})`).join(", ")}.
          </div>
        )}
      </Cartao>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Cartao titulo="Expectativa atendida?">
          <BarrasFatias fatias={inf.expectativa} />
        </Cartao>
        <Cartao titulo="Grupos com pessoas com deficiência">
          {inf.gruposPcd === null ? (
            <SemDados />
          ) : (
            <>
              <div className="text-2xl font-extrabold text-[#182657] mb-3">{inf.gruposPcd}%</div>
              {inf.tiposPcd.length > 0 && <Etiquetas fatias={inf.tiposPcd} />}
            </>
          )}
        </Cartao>
      </div>

      {inf.oQueFalta !== null && (
        <Cartao titulo="O que falta em Olímpia?" nota="texto livre, visível só para a equipe">
          {inf.oQueFalta.length ? (
            <ul className="space-y-2 text-xs text-slate-800">
              {inf.oQueFalta.map((t, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 break-words">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <SemDados />
          )}
        </Cartao>
      )}
    </AnalisePagina>
  );
}
