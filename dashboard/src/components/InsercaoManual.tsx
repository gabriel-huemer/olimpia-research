"use client";

import React, { useState } from "react";
import { Aviso, BOTAO_CLARO, BOTAO_VERDE, CAMPO, Janela, ROTULO } from "@/components/pagina";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { CampoFormulario, SecaoFormulario } from "@/lib/pesquisas/formulario";

const CANAIS = ["Telefone", "Formulário em papel", "E-mail", "Balcão", "Outro"];

/** Digitação de uma pesquisa recebida por outro meio (RF17), com as perguntas do formulário publicado. */
export function InsercaoManual({
  locais, aoFechar, aoSalvar,
}: {
  locais: Array<{ id: string; nome: string }>;
  aoFechar: () => void;
  aoSalvar: (protocolo: string, alertas: number) => void;
}) {
  const { dados, erro } = useDados<{ secoes: SecaoFormulario[] }>("/api/formulario-ativo", false);
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const mudar = (chave: string, v: string | string[]) => setRespostas((r) => ({ ...r, [chave]: v }));

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setOcupado(true);
    try {
      const r = await api<{ protocolo: string; alertas: number }>("/api/pesquisas", {
        method: "POST",
        body: { canal: f.get("canal"), data: f.get("data"), localId: f.get("local") || null, respostas },
      });
      aoSalvar(r.protocolo, r.alertas);
    } catch (x) {
      setFalha((x as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Janela titulo="Inserir resposta manual" aoFechar={aoFechar}>
      <form onSubmit={(e) => void salvar(e)} className="space-y-4">
        <p className="text-xs text-slate-500">
          Para pesquisas recebidas por outro meio. O registro gera um protocolo e fica no seu nome na Auditoria.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="m-canal" className={ROTULO}>Canal</label>
            <select id="m-canal" name="canal" className={CAMPO}>
              {CANAIS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="m-data" className={ROTULO}>Data da pesquisa</label>
            <input id="m-data" name="data" type="date" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="m-local" className={ROTULO}>Local</label>
            <select id="m-local" name="local" className={CAMPO}>
              <option value="">Não informado</option>
              {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
        </div>
        {!dados && <p className="text-xs text-slate-500">{erro ?? "Carregando o formulário..."}</p>}
        {dados?.secoes.map((s, i) => (
          <details key={s.titulo} open={i === 0} className="border border-slate-200 rounded-lg p-3">
            <summary className="text-xs font-bold text-slate-900 cursor-pointer">{s.titulo}</summary>
            <div className="space-y-3 mt-3">
              {s.campos.map((c) => (
                <Campo key={c.chave} campo={c} valor={respostas[c.chave] ?? ""} aoMudar={(v) => mudar(c.chave, v)} />
              ))}
            </div>
          </details>
        ))}
        {falha && <Aviso>{falha}</Aviso>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>Cancelar</button>
          <button type="submit" disabled={ocupado || !dados} className={BOTAO_VERDE}>Salvar e gerar protocolo</button>
        </div>
      </form>
    </Janela>
  );
}

const DICAS: Record<string, string> = {
  MUNICIPIO: "Nome da cidade, do estado escolhido acima",
  MUNICIPIO_MULTIPLO: "Cidade, UF; Cidade, UF",
  MOEDA: "850,50",
  ESCALA_0_10: "0 a 10",
};

function Campo({ campo, valor, aoMudar }: { campo: CampoFormulario; valor: string | string[]; aoMudar: (v: string | string[]) => void }) {
  const id = `m-${campo.chave}`;
  if (campo.tipo === "MULTIPLA_ESCOLHA") {
    const marcadas = Array.isArray(valor) ? valor : [];
    return (
      <fieldset>
        <legend className={ROTULO}>{campo.enunciado}</legend>
        {campo.opcoes.map((o) => (
          <label key={o} className="flex items-center gap-2 text-xs text-slate-800 py-0.5">
            <input
              type="checkbox"
              checked={marcadas.includes(o)}
              onChange={(e) => aoMudar(e.target.checked ? [...marcadas, o] : marcadas.filter((x) => x !== o))}
            />
            {o}
          </label>
        ))}
      </fieldset>
    );
  }
  const texto = Array.isArray(valor) ? "" : valor;
  const tipoInput = campo.tipo === "DATA" ? "date" : "text";
  return (
    <div>
      <label htmlFor={id} className={ROTULO}>{campo.enunciado}</label>
      {campo.opcoes.length > 0 ? (
        <select id={id} value={texto} onChange={(e) => aoMudar(e.target.value)} className={CAMPO}>
          <option value="">Não respondeu</option>
          {campo.opcoes.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={tipoInput}
          maxLength={500}
          placeholder={DICAS[campo.tipo]}
          value={texto}
          onChange={(e) => aoMudar(e.target.value)}
          className={CAMPO}
        />
      )}
    </div>
  );
}
