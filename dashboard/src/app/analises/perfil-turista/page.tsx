"use client";

import React from "react";
import { Users } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";

export default function PerfilTuristaPage() {
  const { analytics } = useApp();
  const pf = analytics.perfilTurista;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Análises · Perfil do turista">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Perfil do visitante e dinâmica dos grupos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Composição etária, perfil autodeclarado, origens, aquisição e
              motivações.
            </p>
          </div>
        </div>

        <AnalyticsHeaderActions
          abaTitulo="Perfil do visitante e dinâmica dos grupos"
          defaultPeriodo="Mês atual"
        />
      </div>

      {/* Filtros */}
      <FilterBar defaultPeriodo="Mês atual" />

      {/* Composição etária + Origens detalhadas (cidades) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Composição etária
          </h2>
          <div className="space-y-3 text-xs">
            {pf.composicaoEtaria.map((item) => (
              <div
                key={item.faixa}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-3 text-slate-600">{item.faixa}</div>
                <div className="col-span-9 flex items-center gap-3">
                  <div
                    style={{ width: `${Math.max(10, item.percentual * 1.8)}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {item.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Origens detalhadas (cidades)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2">Cidade / UF</th>
                  <th className="py-2">Respostas</th>
                  <th className="py-2">% total</th>
                  <th className="py-2">Diária média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {pf.origensCidades.map((cid) => (
                  <tr key={cid.cidadeUf} className="text-[#182657]">
                    <td className="py-3 font-medium">{cid.cidadeUf}</td>
                    <td className="py-3">
                      {cid.respostas.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3">{cid.percentual}</td>
                    <td className="py-3">{cid.diariaMedia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Linha intermediária: Perfil autodeclarado + Como conheceu Olímpia? + Motivações da viagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Perfil autodeclarado
          </h2>

          <div>
            <div className="text-xs text-slate-500 mb-1.5">Escolaridade</div>
            <div className="flex flex-wrap gap-1.5">
              {pf.escolaridade.map((e) => (
                <span
                  key={e.nivel}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-800"
                >
                  {e.nivel} {e.percentual}%
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1.5">Estado civil</div>
            <div className="flex flex-wrap gap-1.5">
              {pf.estadoCivil.map((ec) => (
                <span
                  key={ec.estado}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-800"
                >
                  {ec.estado} {ec.percentual}%
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Como conheceu Olímpia?
          </h2>
          <div className="space-y-3 text-xs">
            {pf.comoConheceu.map((c) => (
              <div
                key={c.canal}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-4 text-slate-600">{c.canal}</div>
                <div className="col-span-8 flex items-center gap-2.5">
                  <div
                    style={{ width: `${Math.max(10, c.percentual)}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {c.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Motivações da viagem
          </h2>
          <div className="space-y-3 text-xs">
            {pf.motivacoes.map((m) => (
              <div
                key={m.motivo}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-4 text-slate-600">{m.motivo}</div>
                <div className="col-span-8 flex items-center gap-2.5">
                  <div
                    style={{ width: `${Math.max(14, m.percentual * 0.85)}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {m.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Concorrência */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-baseline gap-1.5 mb-3">
          <h2 className="text-sm font-bold text-slate-900">Concorrência</h2>
          <span className="text-xs text-slate-500">
            · cidades consideradas em vez de Olímpia
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pf.concorrencia.map((cid) => (
            <span
              key={cid}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium"
            >
              {cid}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold">
            dado do painel atual
          </span>
        </div>
      </div>
    </SidebarLayout>
  );
}
