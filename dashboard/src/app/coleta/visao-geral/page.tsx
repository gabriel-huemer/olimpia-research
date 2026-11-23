"use client";

import React from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { BOTAO_AZUL, BOTAO_VERDE, CAIXA, Codigo, Pagina, Selo } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { useDados } from "@/lib/cliente/useDados";
import type { Operador, VisaoGeral } from "@/lib/operadores/operadores";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function SeloOperador({ o }: { o: Operador }) {
  if (o.atrasado) return <Selo cor="azul">sem enviar há mais de 1 dia</Selo>;
  return o.alertas ? <Selo cor="amarelo">{plural(o.alertas, "alerta", "alertas")}</Selo> : <Selo cor="verde">sem alertas</Selo>;
}

export default function ColetaVisaoGeralPage() {
  const { canManageUsers } = useApp();
  const { dados, erro } = useDados<VisaoGeral & { operadores: Operador[] }>("/api/visao-geral");
  const hoje = new Date().toLocaleDateString("pt-BR", { dateStyle: "full" });
  const n = (v?: number) => (v === undefined ? "—" : v.toLocaleString("pt-BR"));
  const tetoOperador = Math.max(1, ...(dados?.operadores ?? []).map((o) => o.coletas));
  const tetoDia = Math.max(1, ...(dados?.porDia ?? []).map((d) => d.n));

  const kpis: Array<[string, string]> = [
    [n(dados?.respostasNoAno), `pesquisas em ${new Date().getFullYear()}`],
    [n(dados?.hoje), "coletadas hoje"],
    [n(dados?.pendentes), "respostas aguardando revisão"],
    [n(dados?.atrasados), "operadores sem enviar há mais de 1 dia"],
  ];

  return (
    <Pagina titulo="Visão geral" subtitulo={hoje} icone={<LayoutGrid className="w-5 h-5" />} erro={erro}>
      {!!dados?.pendentes && (
        <div className="bg-[#fefce8] border border-[#fde047] rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-800">
            <b>{plural(dados.pendentes, "resposta sinalizada", "respostas sinalizadas")}</b> para revisar.{" "}
            {dados.diasMaisAntiga
              ? `A mais antiga chegou há ${plural(dados.diasMaisAntiga, "dia", "dias")}.`
              : "A mais antiga chegou nas últimas 24 horas."}
          </div>
          <Link href="/coleta/revisao" className={BOTAO_AZUL}>Revisar agora</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map(([v, r]) => (
          <div key={r} className={CAIXA}>
            <div className="text-3xl font-extrabold text-slate-900">{v}</div>
            <div className="text-xs text-slate-500 mt-1.5">{r}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className={`lg:col-span-7 ${CAIXA}`}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Operadores · últimos 7 dias</h2>
          <div className="divide-y divide-slate-200">
            {dados?.operadores.slice(0, 5).map((o) => (
              <div key={o.id} className="py-3 grid grid-cols-12 items-center gap-3 text-sm text-[#182657]">
                <div className="col-span-4 font-medium">{o.nome}</div>
                <div className="col-span-3">
                  <div style={{ width: `${(o.coletas / tetoOperador) * 100}%` }} className="h-3 rounded-full bg-[#008767]" />
                </div>
                <div className="col-span-1 font-extrabold text-right">{o.coletas}</div>
                <div className="col-span-4 flex justify-end"><SeloOperador o={o} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-5 ${CAIXA}`}>
          <h2 className="text-sm font-bold text-slate-900 mb-6">Coletas por dia</h2>
          <div className="grid grid-cols-7 gap-2 items-end h-28 border-b border-slate-200 pb-1">
            {dados?.porDia.map((d) => (
              <div
                key={d.dia}
                title={`${d.dia}: ${d.n}`}
                style={{ height: `${(d.n / tetoDia) * 100}%` }}
                className="w-full rounded-t-md bg-[#008767]"
              />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 text-[11px] text-slate-500 text-center mt-1">
            {dados?.porDia.map((d) => <span key={d.dia}>{d.dia}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-7 ${CAIXA}`}>
          <h2 className="text-sm font-bold text-slate-900 mb-2.5">Formulário ativo</h2>
          {dados?.formulario ? (
            <div className="text-sm text-[#182657] font-medium">
              {dados.formulario.nome} <Selo cor="verde">ativo</Selo>
              <div className="text-xs text-slate-500 font-normal mt-1.5">
                v{dados.formulario.versao} · {dados.formulario.secoes} seções
                {dados.ultimoProtocolo && <> · último protocolo recebido <Codigo>{dados.ultimoProtocolo}</Codigo></>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">{dados ? "Nenhum formulário publicado." : "Carregando..."}</p>
          )}
        </div>
        <div className={`lg:col-span-5 ${CAIXA}`}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Atalhos</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/coleta/formularios" className={BOTAO_AZUL}>Formulários</Link>
            <Link href="/coleta/pesquisas" className={BOTAO_VERDE}>Pesquisas</Link>
            {canManageUsers && <Link href="/sistema/importacao" className={BOTAO_VERDE}>Importar planilha</Link>}
          </div>
        </div>
      </div>
    </Pagina>
  );
}
