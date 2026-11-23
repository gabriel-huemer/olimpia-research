"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckSquare } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";
import type { Decisao, DetalheCuradoria, ItemFila } from "@/lib/curadoria/tipos";

const NA_FILA = 4;
const RESUMO = 5;
const FEITO: Record<Decisao, string> = { APROVAR: "aprovada", CORRIGIR: "corrigida", EXCLUIR: "excluída" };
const CAMPO =
  "w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]";
const ROTULO = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1";

async function ler<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(corpo?.erro ?? "Não foi possível falar com o servidor."), { status: r.status });
  return corpo as T;
}

export default function RevisaoPage() {
  const { currentUser, recarregarEstado, showToast } = useApp();
  const podeDecidir = Boolean(currentUser?.areas.coleta);
  const podeExcluir = podeDecidir && Boolean(currentUser?.areas.sistema);

  const [fila, setFila] = useState<ItemFila[] | null>(null);
  const [erroFila, setErroFila] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [mostrarFila, setMostrarFila] = useState(false);

  const carregarFila = useCallback(async () => {
    try {
      const { itens } = await ler<{ itens: ItemFila[] }>("/api/curadoria");
      setFila(itens);
      setErroFila(null);
    } catch (e) {
      setErroFila((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void carregarFila();
    const timer = setInterval(() => void carregarFila(), 15000);
    return () => clearInterval(timer);
  }, [carregarFila]);

  // Sem escolha (ou escolha que já saiu da fila), mostra o primeiro. Enquanto o item estiver na fila, ele não troca sozinho.
  const atual = fila?.find((i) => i.id === selecionado) ?? fila?.[0] ?? null;

  const aposDecidir = async () => {
    await Promise.all([carregarFila(), recarregarEstado()]);
  };

  const visiveis = mostrarFila ? fila ?? [] : (fila ?? []).slice(0, NA_FILA);
  const restantes = (fila?.length ?? 0) - visiveis.length;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Revisão de respostas sinalizadas">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Revisão</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {fila === null
              ? "Carregando a fila..."
              : fila.length === 1
              ? "1 resposta aguarda decisão."
              : `${fila.length} respostas aguardam decisão.`}
          </p>
        </div>
      </div>

      {erroFila && (
        <div role="alert" className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-xs text-rose-800">
          {erroFila}{" "}
          <button type="button" onClick={() => void carregarFila()} className="font-semibold underline">
            Tentar de novo
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            FILA (MAIS ANTIGAS PRIMEIRO)
          </div>
          {visiveis.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={atual?.id === item.id}
              onClick={() => setSelecionado(item.id)}
              className={`w-full text-left bg-white rounded-xl p-3.5 transition border ${
                atual?.id === item.id
                  ? "border-2 border-[#008767] shadow-2xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono font-bold">
                  {item.protocolo}
                </span>
                <span className="font-semibold text-[#182657]">{item.pergunta}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {item.operador} · {item.coletada}
              </div>
            </button>
          ))}
          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setMostrarFila(true)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-1 pt-1 block"
            >
              + {restantes} outras
            </button>
          )}
        </div>

        <div className="lg:col-span-8">
          {atual ? (
            <PainelDecisao
              key={atual.id}
              id={atual.id}
              podeDecidir={podeDecidir}
              podeExcluir={podeExcluir}
              avisar={showToast}
              aoDecidir={aposDecidir}
            />
          ) : (
            fila !== null && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                Todas as respostas sinalizadas foram revisadas!
              </div>
            )
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

interface PainelProps {
  id: string;
  podeDecidir: boolean;
  podeExcluir: boolean;
  avisar: (msg: string) => void;
  aoDecidir: () => Promise<void>;
}

/** Remontado a cada item (key): valor e motivo sempre começam vazios. */
function PainelDecisao({ id, podeDecidir, podeExcluir, avisar, aoDecidir }: PainelProps) {
  const [detalhe, setDetalhe] = useState<DetalheCuradoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [verTodas, setVerTodas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const travado = useRef(false);

  useEffect(() => {
    const c = new AbortController();
    ler<DetalheCuradoria>(`/api/curadoria/${id}`, { signal: c.signal })
      .then(setDetalhe)
      .catch((e) => {
        if (!c.signal.aborted) setErro((e as Error).message);
      });
    return () => c.abort();
  }, [id]);

  const decidir = async (decisao: Decisao) => {
    if (!detalhe || travado.current) return;
    if (decisao === "CORRIGIR" && !novoValor.trim()) return setErro("Informe o novo valor.");
    if (decisao !== "APROVAR" && !motivo.trim()) return setErro("Informe o motivo.");
    travado.current = true;
    setEnviando(true);
    setErro(null);
    try {
      const r = await ler<{ aviso: string | null }>(`/api/curadoria/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao, motivo, ...(decisao === "CORRIGIR" && { novoValor }) }),
      });
      avisar(`Resposta de ${detalhe.protocolo} ${FEITO[decisao]}.${r.aviso ? ` ${r.aviso}` : ""}`);
      await aoDecidir();
    } catch (e) {
      const { message, status } = e as Error & { status?: number };
      if (status === 409 || status === 404) {
        avisar(message);
        await aoDecidir();
      } else {
        setErro(message);
      }
    } finally {
      travado.current = false;
      setEnviando(false);
    }
  };

  const caixaErro = erro && (
    <div role="alert" className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-xs text-rose-800">
      {erro}
    </div>
  );
  if (!detalhe) {
    return (
      caixaErro || (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Carregando a pesquisa...
        </div>
      )
    );
  }

  const ordenadas = [...detalhe.respostas].sort((a, b) => Number(b.sinalizada) - Number(a.sinalizada));
  const respostas = verTodas ? detalhe.respostas : ordenadas.slice(0, RESUMO);
  const numerico = detalhe.tipo === "NUMERO" || detalhe.tipo === "MOEDA";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
        <span>Pesquisa</span>
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs">{detalhe.protocolo}</span>
        <span>· {detalhe.origem}</span>
      </div>
      <p className="text-xs text-slate-500">
        {detalhe.operador} · {detalhe.local} · {detalhe.coletada}
      </p>

      <div className="bg-[#fefce8] border border-[#fde047] rounded-lg px-4 py-2.5 text-xs text-slate-800">
        {detalhe.motivos.map((m, i) => (
          <div key={i} className="font-bold text-slate-900">
            {m}
          </div>
        ))}
        {detalhe.mantidoPeloPesquisador && <div>O pesquisador escolheu &quot;Manter e sinalizar&quot;.</div>}
      </div>

      <dl className="divide-y divide-slate-200 text-sm">
        {respostas.map((r) => (
          <div key={r.pergunta} className="py-3 grid grid-cols-12 gap-2">
            <dt className="col-span-5 text-slate-500">{r.pergunta}</dt>
            <dd className="col-span-7 text-[#182657] font-medium break-words">
              <span className={r.sinalizada ? "px-1.5 py-0.5 rounded bg-[#fef08a] font-extrabold" : ""}>{r.valor}</span>
            </dd>
          </div>
        ))}
      </dl>
      {detalhe.respostas.length > RESUMO && (
        <button
          type="button"
          aria-expanded={verTodas}
          onClick={() => setVerTodas((v) => !v)}
          className="text-xs text-[#182657] font-semibold underline"
        >
          {verTodas ? "Ver menos" : `Ver todas as respostas (${detalhe.respostas.length})`}
        </button>
      )}

      {podeDecidir && (
        <div className="border-t border-slate-200 pt-4 space-y-3.5">
          {numerico && (
            <div>
              <label htmlFor="revisao-novo-valor" className={ROTULO}>
                Novo valor (para corrigir): {detalhe.pergunta}
              </label>
              <input
                id="revisao-novo-valor"
                type="text"
                inputMode="decimal"
                value={novoValor}
                disabled={enviando}
                onChange={(e) => setNovoValor(e.target.value)}
                className={CAMPO}
              />
            </div>
          )}
          <div>
            <label htmlFor="revisao-motivo" className={ROTULO}>
              Motivo (fica na auditoria; obrigatório {podeExcluir ? "para corrigir ou excluir" : "para corrigir"})
            </label>
            <input
              id="revisao-motivo"
              type="text"
              maxLength={500}
              value={motivo}
              disabled={enviando}
              onChange={(e) => setMotivo(e.target.value)}
              className={CAMPO}
            />
          </div>
          {caixaErro}
          <div className="flex flex-wrap items-center gap-2.5 [&>button]:px-4 [&>button]:py-2.5 [&>button]:rounded-lg [&>button]:text-xs [&>button]:font-semibold [&>button]:transition [&>button:disabled]:opacity-50">
            <button
              type="button"
              disabled={enviando}
              onClick={() => void decidir("APROVAR")}
              className="bg-[#008767] hover:bg-[#006e54] text-white"
            >
              Aprovar como está
            </button>
            {numerico && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => void decidir("CORRIGIR")}
                className="bg-[#182657] hover:bg-[#23366e] text-white"
              >
                Corrigir valor
              </button>
            )}
            {podeExcluir && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => void decidir("EXCLUIR")}
                className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-800"
              >
                Excluir resposta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
