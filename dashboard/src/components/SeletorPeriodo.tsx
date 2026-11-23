"use client";

import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { ANO, MES, PERSONALIZADO, hojeLocal, rotuloPeriodo } from "@/lib/periodo";
import { BOTAO_CLARO, BOTAO_VERDE, CAMPO, Janela, ROTULO } from "@/components/pagina";

const ESCOLHER = "personalizado";

export function SeletorPeriodo({ valor, opcoes, aoMudar }: { valor: string; opcoes: string[]; aoMudar: (v: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const fechar = React.useCallback(() => setAberto(false), []);

  const abrir = () => {
    const atual = PERSONALIZADO.exec(valor);
    const hoje = hojeLocal();
    setDe(atual?.[1] ?? `${hoje.slice(0, 8)}01`);
    setAte(atual?.[2] ?? hoje);
    setAberto(true);
  };
  const aplicar = (e: React.FormEvent) => {
    e.preventDefault();
    aoMudar(`${de}..${ate}`);
    fechar();
  };

  const personalizado = PERSONALIZADO.test(valor);
  // A opção escolhida continua na lista mesmo antes de as opções chegarem do servidor.
  const lista = personalizado || opcoes.includes(valor) ? opcoes : [valor, ...opcoes];
  const grupos: Array<[string, string[]]> = [
    ["Rápido", lista.filter((o) => !MES.test(o) && !ANO.test(o))],
    ["Mês", lista.filter((o) => MES.test(o))],
    ["Ano", lista.filter((o) => ANO.test(o))],
  ];

  return (
    <>
      <div className="flex max-w-full items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 shadow-2xs">
        <span className="text-slate-400">Período:</span>
        <select
          aria-label="Selecionar período"
          value={valor}
          onChange={(e) => (e.target.value === ESCOLHER ? abrir() : aoMudar(e.target.value))}
          className="min-w-0 font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
        >
          {grupos.map(([nome, itens]) =>
            itens.length ? (
              <optgroup key={nome} label={nome}>
                {itens.map((o) => (
                  <option key={o} value={o}>{rotuloPeriodo(o)}</option>
                ))}
              </optgroup>
            ) : null
          )}
          <optgroup label="Personalizado">
            {personalizado && <option value={valor}>{rotuloPeriodo(valor)}</option>}
            <option value={ESCOLHER}>Escolher datas…</option>
          </optgroup>
        </select>
        <button type="button" onClick={abrir} aria-label="Escolher datas no calendário" title="Escolher datas" className="p-0.5 text-slate-500 hover:text-[#008767]">
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>
      {aberto && (
        <Janela titulo="Período personalizado" aoFechar={fechar}>
          <form onSubmit={aplicar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="periodo-de" className={ROTULO}>De</label>
                <input id="periodo-de" type="date" required min="2000-01-01" max={ate || "2099-12-31"} value={de} onChange={(e) => setDe(e.target.value)} onClick={abrirCalendario} className={CAMPO} />
              </div>
              <div>
                <label htmlFor="periodo-ate" className={ROTULO}>Até (inclui o dia)</label>
                <input id="periodo-ate" type="date" required min={de || "2000-01-01"} max="2099-12-31" value={ate} onChange={(e) => setAte(e.target.value)} onClick={abrirCalendario} className={CAMPO} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={fechar} className={BOTAO_CLARO}>Cancelar</button>
              <button type="submit" className={BOTAO_VERDE}>Aplicar</button>
            </div>
          </form>
        </Janela>
      )}
    </>
  );
}

// Abre o calendário ao clicar em qualquer parte do campo, não só no ícone.
function abrirCalendario(e: React.MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker();
  } catch {
    // navegador sem showPicker: o ícone do campo continua funcionando
  }
}
