"use client";

import React, { useState } from "react";
import { UserCheck } from "lucide-react";
import {
  BOTAO_CLARO, BOTAO_VERDE, CAIXA, CAMPO, Codigo, Janela, Pagina, ROTULO, Selo, Tabela,
} from "@/components/pagina";
import { SeletorPeriodo } from "@/components/SeletorPeriodo";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { Operador } from "@/lib/operadores/operadores";

interface Resposta {
  operadores: Operador[];
  locais: Array<{ id: string; nome: string }>;
  periodos: string[];
}

const NOVO = "novo";
const TAXA_ALTA = 10;

const decimal = (n: number) => n.toFixed(1).replace(".", ",");
const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca enviou";

export default function OperadoresPage() {
  const { canManageUsers, showToast } = useApp();
  const [periodo, setPeriodo] = useState("Últimos 30 dias");
  const { dados, erro, setErro, recarregar } = useDados<Resposta>(`/api/operadores?${new URLSearchParams({ periodo })}`);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [codigoNovo, setCodigoNovo] = useState<{ nome: string; codigo: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const lista = dados?.operadores ?? [];
  const atual = lista.find((o) => o.id === selecionado) ?? lista[0] ?? null;
  const ativos = lista.filter((o) => o.ativo);
  const coletas = lista.reduce((s, o) => s + o.coletas, 0);
  const alertas = lista.reduce((s, o) => s + o.alertas, 0);
  const teto = Math.max(1, ...lista.map((o) => o.coletas));

  const executar = async (f: () => Promise<void>) => {
    setOcupado(true);
    try {
      await f();
      recarregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const editar = (o: Operador, body: Record<string, unknown>, msg: string) =>
    executar(async () => {
      const r = await api<{ codigo?: string }>(`/api/operadores/${o.id}`, { method: "PATCH", body });
      if (r.codigo) setCodigoNovo({ nome: o.nome, codigo: r.codigo });
      showToast(msg);
    });

  const criar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get("nome"));
    const local = String(f.get("local"));
    void executar(async () => {
      const r = await api<{ codigo: string }>("/api/operadores", {
        method: "POST",
        body: { nome, ...(local === NOVO ? { novoLocal: f.get("novoLocal") } : { localId: local }) },
      });
      setCriando(false);
      setCodigoNovo({ nome, codigo: r.codigo });
    });
  };

  const kpis = [
    [String(ativos.length), "operadores ativos"],
    [coletas.toLocaleString("pt-BR"), "pesquisas no período"],
    [`${decimal(coletas ? (alertas / coletas) * 100 : 0)}%`, "das pesquisas com alerta"],
    [String(ativos.filter((o) => o.atrasado).length), "sem enviar há mais de um dia"],
  ];

  return (
    <Pagina
      titulo="Operadores"
      subtitulo="Desempenho da equipe de campo."
      icone={<UserCheck className="w-5 h-5" />}
      erro={erro}
      acoes={
        <>
          <SeletorPeriodo valor={periodo} opcoes={dados?.periodos ?? []} aoMudar={setPeriodo} />
          {canManageUsers && (
            <button type="button" onClick={() => setCriando(true)} className={BOTAO_VERDE}>
              Novo operador
            </button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map(([v, r]) => (
          <div key={r} className={CAIXA}>
            <div className="text-3xl font-extrabold text-slate-900">{v}</div>
            <div className="text-xs text-slate-500 mt-1.5">{r}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={`lg:col-span-8 ${CAIXA}`}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Ranking de coletas</h2>
          {lista.length === 0 ? (
            <p className="text-xs text-slate-500">{dados ? "Nenhum operador cadastrado." : "Carregando..."}</p>
          ) : (
            <Tabela colunas={["Operador", "Coletas", "", "Com alerta", "Último envio"]}>
              {lista.map((o) => (
                <tr key={o.id} className={o.id === atual?.id ? "bg-slate-50" : ""}>
                  <td className="py-3 pr-4">
                    <button type="button" onClick={() => setSelecionado(o.id)} className="font-medium text-left hover:underline">
                      {o.nome}
                    </button>{" "}
                    {!o.ativo && <Selo cor="vermelho">Inativo</Selo>}
                  </td>
                  <td className="py-3 pr-4 font-extrabold">{o.coletas}</td>
                  <td className="py-3 pr-4 w-32">
                    <div style={{ width: `${(o.coletas / teto) * 100}%` }} className="h-3 rounded-full bg-[#008767]" />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {decimal(o.taxaAlerta)}% {o.taxaAlerta > TAXA_ALTA && <Selo cor="amarelo">alta</Selo>}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {o.atrasado ? <Selo cor="azul">{quando(o.ultimoEnvio)}</Selo> : quando(o.ultimoEnvio)}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </div>

        {atual && (
          <div className={`lg:col-span-4 ${CAIXA}`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-slate-900">{atual.nome}</h2>
              {atual.codigo && <Codigo>{atual.codigo}</Codigo>}
            </div>
            <div className="text-xs text-slate-500 mb-5">Local habitual: {atual.local?.nome ?? "não definido"}</div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 border-b border-slate-200 pb-1 mb-2">
              {atual.porDia.map((n, i) => (
                <div
                  key={i}
                  title={`${n} coletas`}
                  style={{ height: `${(n / Math.max(1, ...atual.porDia)) * 100}%` }}
                  className="w-full rounded-t bg-[#008767]"
                />
              ))}
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Últimos 7 dias: {decimal(atual.porDia.reduce((s, n) => s + n, 0) / 7)} coletas por dia
            </div>
            {canManageUsers && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void editar(atual, { redefinirCodigo: true }, "Código redefinido.")}
                  className={BOTAO_CLARO}
                >
                  Redefinir código
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void editar(atual, { ativo: !atual.ativo }, atual.ativo ? "Operador desativado." : "Operador reativado.")}
                  className={BOTAO_CLARO}
                >
                  {atual.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {criando && dados && (
        <Janela titulo="Cadastrar operador" aoFechar={() => setCriando(false)}>
          <FormularioOperador locais={dados.locais} ocupado={ocupado} aoEnviar={criar} aoCancelar={() => setCriando(false)} />
        </Janela>
      )}

      {codigoNovo && (
        <Janela titulo={`Código de ${codigoNovo.nome}`} aoFechar={() => setCodigoNovo(null)}>
          <p className="text-xs text-slate-600 mb-4">
            Entregue este código ao pesquisador. Ele vale para entrar no aplicativo. Um código anterior deixa de funcionar.
          </p>
          <div className="text-3xl font-mono font-extrabold text-center text-[#182657] mb-5">{codigoNovo.codigo}</div>
          <div className="text-right">
            <button type="button" onClick={() => setCodigoNovo(null)} className={BOTAO_VERDE}>
              Entendi
            </button>
          </div>
        </Janela>
      )}
    </Pagina>
  );
}

function FormularioOperador({
  locais, ocupado, aoEnviar, aoCancelar,
}: {
  locais: Resposta["locais"];
  ocupado: boolean;
  aoEnviar: (e: React.FormEvent<HTMLFormElement>) => void;
  aoCancelar: () => void;
}) {
  const [local, setLocal] = useState(locais[0]?.id ?? NOVO);
  return (
    <form onSubmit={aoEnviar} className="space-y-3">
      <div>
        <label htmlFor="op-nome" className={ROTULO}>Nome completo</label>
        <input id="op-nome" name="nome" required maxLength={150} className={CAMPO} />
      </div>
      <div>
        <label htmlFor="op-local" className={ROTULO}>Local habitual de coleta</label>
        <select id="op-local" name="local" value={local} onChange={(e) => setLocal(e.target.value)} className={CAMPO}>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
          <option value={NOVO}>Outro local...</option>
        </select>
      </div>
      {local === NOVO && (
        <div>
          <label htmlFor="op-novo-local" className={ROTULO}>Nome do local</label>
          <input id="op-novo-local" name="novoLocal" required maxLength={120} className={CAMPO} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={aoCancelar} className={BOTAO_CLARO}>Cancelar</button>
        <button type="submit" disabled={ocupado} className={BOTAO_VERDE}>Cadastrar e gerar código</button>
      </div>
    </form>
  );
}
