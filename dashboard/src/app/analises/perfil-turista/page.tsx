"use client";

import React from "react";
import { Users } from "lucide-react";
import { AnalisePagina, Barras, BarrasFatias, Cartao, Etiquetas, reais, SemDados } from "@/components/analises";
import { useApp } from "@/context/AppContext";

export default function PerfilTuristaPage() {
  const { paineis } = useApp();
  const pf = paineis.perfil;

  return (
    <AnalisePagina
      trilha="Perfil do turista"
      titulo="Perfil do visitante e dinâmica dos grupos"
      subtitulo="Faixa etária, perfil autodeclarado, origens, aquisição e motivações."
      icone={<Users className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <Cartao titulo="Idade do respondente" className="lg:col-span-5">
          <BarrasFatias fatias={pf.idades} />
        </Cartao>
        <Cartao titulo="Origens detalhadas (cidades)" nota="com 5 respostas ou mais" className="lg:col-span-7">
          {pf.cidades.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                    <th scope="col" className="py-2">Cidade / UF</th>
                    <th scope="col" className="py-2">Respostas</th>
                    <th scope="col" className="py-2">% total</th>
                    <th scope="col" className="py-2">Gasto médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {pf.cidades.map((c) => (
                    <tr key={c.cidade} className="text-[#182657]">
                      <td className="py-3 font-medium">{c.cidade}</td>
                      <td className="py-3">{c.respostas.toLocaleString("pt-BR")}</td>
                      <td className="py-3">{c.percentual}%</td>
                      <td className="py-3">{reais(c.gastoMedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <SemDados />
          )}
        </Cartao>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Cartao titulo="Perfil autodeclarado">
          <h3 className="text-xs text-slate-500 mb-1.5">Escolaridade</h3>
          <Etiquetas fatias={pf.escolaridade} />
          <h3 className="text-xs text-slate-500 mt-3 mb-1.5">Estado civil</h3>
          <Etiquetas fatias={pf.estadoCivil} />
        </Cartao>
        <Cartao titulo="Como conheceu Olímpia?">
          <BarrasFatias fatias={pf.conhecimento} />
        </Cartao>
        <Cartao titulo="Motivações da viagem" nota="pode marcar mais de uma">
          <BarrasFatias fatias={pf.motivos} />
        </Cartao>
      </div>

      <Cartao titulo="Concorrência" nota="cidades consideradas em vez de Olímpia, em número de respostas">
        <Barras
          itens={pf.concorrencia.map((c) => ({ rotulo: c.rotulo, texto: String(c.n), largura: c.percentual }))}
        />
      </Cartao>
    </AnalisePagina>
  );
}
