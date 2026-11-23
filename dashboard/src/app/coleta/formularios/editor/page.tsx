"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit3 } from "lucide-react";
import { BOTAO_CLARO, BOTAO_PERIGO, BOTAO_VERDE, CAIXA, CAMPO, Janela, Pagina, ROTULO, Selo } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { PerguntaEdicao, SecaoEdicao, VersaoCompleta } from "@/lib/formularios/formularios";

const TIPOS: Record<string, string> = {
  UNICA_ESCOLHA: "Escolha única",
  MULTIPLA_ESCOLHA: "Escolha múltipla",
  NUMERO: "Número",
  MOEDA: "Valor em reais",
  ESCALA_0_10: "Escala de 0 a 10",
  DATA: "Data",
  TEXTO: "Texto",
  MUNICIPIO: "Cidade (IBGE)",
  MUNICIPIO_MULTIPLO: "Cidades (IBGE)",
  MATRIZ_AVALIACAO: "Avaliação por itens",
};
const NOVOS = ["UNICA_ESCOLHA", "MULTIPLA_ESCOLHA", "NUMERO", "MOEDA", "ESCALA_0_10", "DATA", "TEXTO"];
const NUMERICOS = ["NUMERO", "MOEDA"];
const ESCOLHAS = ["UNICA_ESCOLHA", "MULTIPLA_ESCOLHA"];
const linhas = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

type Acao = (corpo: Record<string, unknown>, msg: string) => Promise<boolean>;

function Editor() {
  const id = useSearchParams().get("versao") ?? "";
  const router = useRouter();
  const { showToast } = useApp();
  const { dados, erro, setErro, recarregar } = useDados<VersaoCompleta>(`/api/formularios/${encodeURIComponent(id)}`, false);
  const [ordem, setOrdem] = useState(1);
  const [janela, setJanela] = useState<"pergunta" | "secao" | "publicar" | PerguntaEdicao | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const editavel = dados?.status === "RASCUNHO";
  const secao = dados?.secoes.find((s) => s.ordem === ordem) ?? dados?.secoes[0];

  const acao: Acao = async (corpo, msg) => {
    setOcupado(true);
    try {
      await api("/api/formularios", { method: "POST", body: corpo });
      setJanela(null);
      setErro(null);
      recarregar();
      showToast(msg);
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const publicar = async () => {
    if (await acao({ acao: "publicar" }, "Versão publicada.")) router.push("/coleta/formularios");
  };

  const envio = (montar: (f: FormData) => Record<string, unknown>, msg: string) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void acao(montar(new FormData(e.currentTarget)), msg);
  };

  return (
    <Pagina
      titulo={dados ? `${dados.nome} · v${dados.numero}` : "Formulário"}
      subtitulo={editavel ? "Rascunho. Só vale para pesquisas novas depois de publicado." : "Somente leitura: versão publicada não muda."}
      icone={<Edit3 className="w-5 h-5" />}
      erro={erro}
      acoes={editavel && <button type="button" disabled={ocupado} onClick={() => setJanela("publicar")} className={BOTAO_VERDE}>Publicar versão</button>}
    >
      {dados && secao && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-3 space-y-2">
            {dados.secoes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOrdem(s.ordem)}
                className={`w-full text-left text-xs rounded-lg border px-3 py-2.5 bg-white ${
                  s.id === secao.id ? "border-[#008767] font-bold text-[#182657]" : "border-slate-200 text-slate-700"
                }`}
              >
                {s.ordem}. {s.titulo}
              </button>
            ))}
            {editavel && (
              <button type="button" onClick={() => setJanela("secao")} className={`${BOTAO_CLARO} w-full`}>Adicionar seção</button>
            )}
          </div>

          <div className={`lg:col-span-9 ${CAIXA}`}>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Seção {secao.ordem} · {secao.titulo}</h2>
            <div className="divide-y divide-slate-200">
              {secao.perguntas.map((p) => (
                <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="text-xs">
                    <div className="text-sm font-medium text-[#182657]">{p.enunciado} <Selo cor="cinza">{TIPOS[p.tipo] ?? p.tipo}</Selo></div>
                    {p.opcoes.length > 0 && <div className="text-slate-500 mt-1">{p.opcoes.join(" · ")}</div>}
                    {(p.min !== null || p.max !== null) && (
                      <div className="text-amber-800 mt-1">Alerta: abaixo de {p.min ?? "—"} ou acima de {p.max ?? "—"}</div>
                    )}
                    {p.condicao?.values && <div className="text-slate-500 mt-1">Aparece se {p.condicao.key} = {p.condicao.values.join(" ou ")}</div>}
                  </div>
                  {editavel && <button type="button" onClick={() => setJanela(p)} className={BOTAO_CLARO}>Editar</button>}
                </div>
              ))}
              {secao.perguntas.length === 0 && <p className="text-xs text-slate-500 py-3">Seção vazia.</p>}
            </div>
            {editavel && (
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setJanela("pergunta")} className={BOTAO_CLARO}>Adicionar pergunta</button>
                {secao.perguntas.length === 0 && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void acao({ acao: "removerSecao", secaoId: secao.id }, "Seção removida.")}
                    className={BOTAO_PERIGO}
                  >
                    Remover seção
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {janela === "secao" && (
        <Janela titulo="Nova seção" aoFechar={() => setJanela(null)}>
          <form onSubmit={envio((f) => ({ acao: "adicionarSecao", titulo: f.get("titulo") }), "Seção adicionada.")} className="space-y-3">
            <label htmlFor="s-titulo" className={ROTULO}>Título</label>
            <input id="s-titulo" name="titulo" required maxLength={120} className={CAMPO} />
            <button type="submit" disabled={ocupado} className={BOTAO_VERDE}>Adicionar</button>
          </form>
        </Janela>
      )}
      {janela === "pergunta" && dados && secao && (
        <NovaPergunta versao={dados} secao={secao} ocupado={ocupado} acao={acao} aoFechar={() => setJanela(null)} />
      )}
      {janela === "publicar" && (
        <Janela titulo="Publicar esta versão?" aoFechar={() => setJanela(null)}>
          <p className="text-xs text-slate-700 mb-4">
            Ela passa a valer para as pesquisas novas e não poderá mais ser alterada. A versão atual fica encerrada, mas continua consultável.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setJanela(null)} className={BOTAO_CLARO}>Cancelar</button>
            <button type="button" disabled={ocupado} onClick={() => void publicar()} className={BOTAO_VERDE}>Publicar</button>
          </div>
        </Janela>
      )}
      {janela !== null && typeof janela === "object" && (
        <Janela titulo="Editar pergunta" aoFechar={() => setJanela(null)}>
          <form
            onSubmit={envio(
              (f) => ({
                acao: "editarPergunta",
                perguntaId: janela.id,
                enunciado: f.get("enunciado"),
                novasOpcoes: linhas(f.get("novas")),
                ...(NUMERICOS.includes(janela.tipo) && { min: f.get("min"), max: f.get("max") }),
              }),
              "Pergunta salva."
            )}
            className="space-y-3"
          >
            <label htmlFor="p-enunciado" className={ROTULO}>Enunciado</label>
            <input id="p-enunciado" name="enunciado" required maxLength={300} defaultValue={janela.enunciado} className={CAMPO} />
            {ESCOLHAS.includes(janela.tipo) && janela.codigo !== "estado" && (
              <>
                <label htmlFor="p-novas" className={ROTULO}>Novas opções (uma por linha)</label>
                <textarea id="p-novas" name="novas" rows={3} className={CAMPO} />
              </>
            )}
            {NUMERICOS.includes(janela.tipo) && <Faixa min={janela.min} max={janela.max} />}
            <div className="flex justify-between gap-2">
              {janela.original ? (
                <span className="text-xs text-slate-500">Pergunta do formulário original: não pode ser removida.</span>
              ) : (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void acao({ acao: "removerPergunta", perguntaId: janela.id }, "Pergunta removida.")}
                  className={BOTAO_PERIGO}
                >
                  Remover
                </button>
              )}
              <button type="submit" disabled={ocupado} className={BOTAO_VERDE}>Salvar</button>
            </div>
          </form>
        </Janela>
      )}
    </Pagina>
  );
}

function Faixa({ min, max }: { min: number | null; max: number | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="p-min" className={ROTULO}>Alerta abaixo de</label>
        <input id="p-min" name="min" type="number" min={0} defaultValue={min ?? ""} className={CAMPO} />
      </div>
      <div>
        <label htmlFor="p-max" className={ROTULO}>Alerta acima de</label>
        <input id="p-max" name="max" type="number" min={0} defaultValue={max ?? ""} className={CAMPO} />
      </div>
    </div>
  );
}

function NovaPergunta({
  versao, secao, ocupado, acao, aoFechar,
}: {
  versao: VersaoCompleta;
  secao: SecaoEdicao;
  ocupado: boolean;
  acao: Acao;
  aoFechar: () => void;
}) {
  const [tipo, setTipo] = useState(NOVOS[0]);
  const [origem, setOrigem] = useState("");
  const candidatas = versao.secoes
    .filter((s) => s.ordem <= secao.ordem)
    .flatMap((s) => s.perguntas)
    .filter((p) => p.tipo === "UNICA_ESCOLHA" && p.opcoes.length > 0);
  const opcoesOrigem = candidatas.find((p) => p.codigo === origem)?.opcoes ?? [];

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void acao(
      {
        acao: "adicionarPergunta",
        secaoId: secao.id,
        tipo,
        enunciado: f.get("enunciado"),
        ...(ESCOLHAS.includes(tipo) && { opcoes: linhas(f.get("opcoes")) }),
        ...(NUMERICOS.includes(tipo) && { min: f.get("min"), max: f.get("max") }),
        ...(origem && { condicao: { key: origem, values: [f.get("valor")] } }),
      },
      "Pergunta adicionada."
    );
  };

  return (
    <Janela titulo="Nova pergunta" aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-3">
        <label htmlFor="n-enunciado" className={ROTULO}>Enunciado</label>
        <input id="n-enunciado" name="enunciado" required maxLength={300} className={CAMPO} />
        <label htmlFor="n-tipo" className={ROTULO}>Tipo</label>
        <select id="n-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={CAMPO}>
          {NOVOS.map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
        </select>
        {ESCOLHAS.includes(tipo) && (
          <>
            <label htmlFor="n-opcoes" className={ROTULO}>Opções (uma por linha)</label>
            <textarea id="n-opcoes" name="opcoes" rows={4} required className={CAMPO} />
          </>
        )}
        {NUMERICOS.includes(tipo) && <Faixa min={null} max={null} />}
        <label htmlFor="n-origem" className={ROTULO}>Aparece só se</label>
        <select id="n-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} className={CAMPO}>
          <option value="">Sempre aparece</option>
          {candidatas.map((p) => <option key={p.codigo} value={p.codigo}>{p.enunciado}</option>)}
        </select>
        {origem && (
          <select name="valor" aria-label="Valor da condição" className={CAMPO}>
            {opcoesOrigem.map((o) => <option key={o}>{o}</option>)}
          </select>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>Cancelar</button>
          <button type="submit" disabled={ocupado} className={BOTAO_VERDE}>Adicionar</button>
        </div>
      </form>
    </Janela>
  );
}

// Sem a versão no endereço não há o que editar: volta para a lista.
function EditorOuLista() {
  const temVersao = Boolean(useSearchParams().get("versao"));
  const router = useRouter();
  useEffect(() => {
    if (!temVersao) router.replace("/coleta/formularios");
  }, [temVersao, router]);
  return temVersao ? <Editor /> : null;
}

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorOuLista />
    </Suspense>
  );
}
