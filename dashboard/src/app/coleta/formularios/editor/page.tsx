"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Edit3, Smartphone } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";
import type { PerguntaItem } from "@/lib/mockAndSeedData";

function EditorFormularioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formularios, dispatchAction, canEdit, showToast } = useApp();

  const formAtivo = formularios[0];
  const secoes = formAtivo?.secoes || [];

  const initialSecaoOrder = Number(searchParams.get("secao")) || 4;
  const [selectedSecaoOrdem, setSelectedSecaoOrdem] =
    useState<number>(initialSecaoOrder);
  const [selectedPerguntaId, setSelectedPerguntaId] = useState<number>(402);

  // Estado editável para o painel direito "Propriedades da pergunta"
  const [texto, setTexto] = useState("Como chegou do aeroporto a Olímpia?");
  const [obrigatoria, setObrigatoria] = useState(true);
  const [condicaoExibicao, setCondicaoExibicao] = useState("Transporte = Aéreo");
  const [regraAlerta, setRegraAlerta] = useState("Nenhuma");
  const [rotuloIndicador, setRotuloIndicador] = useState("transporte_aeroporto");

  // Modal de pré-visualização no app e adicionar pergunta
  const [showAppPreview, setShowAppPreview] = useState(false);
  const [showAddPergunta, setShowAddPergunta] = useState(false);
  const [novoEnunciado, setNovoEnunciado] = useState("");
  const [novoTipo, setNovoTipo] = useState("escolha única");
  const [novasOpcoes, setNovasOpcoes] = useState("Sim · Não");

  const secaoAtual =
    secoes.find((s) => s.ordem === selectedSecaoOrdem) || secoes[3] || secoes[0];

  useEffect(() => {
    const qParam = Number(searchParams.get("secao"));
    if (qParam && qParam >= 1 && qParam <= 15) {
      setSelectedSecaoOrdem(qParam);
    }
  }, [searchParams]);

  const selectPergunta = (p: PerguntaItem) => {
    setSelectedPerguntaId(p.id);
    setTexto(p.enunciado);
    setObrigatoria(p.obrigatoria);
    setCondicaoExibicao(p.condicaoExibicao);
    setRegraAlerta(p.regraAlerta);
    setRotuloIndicador(p.rotuloIndicador);
  };

  const handleSavePropertyChange = async (
    updatedFields: Partial<PerguntaItem>
  ) => {
    if (!secaoAtual || !canEdit) return;
    const pAtual =
      secaoAtual.perguntas.find((p) => p.id === selectedPerguntaId) ||
      secaoAtual.perguntas[0];
    if (!pAtual) return;

    await dispatchAction("SALVAR_PERGUNTA_FORMULARIO", {
      secaoId: secaoAtual.id,
      pergunta: {
        ...pAtual,
        enunciado: texto,
        obrigatoria,
        condicaoExibicao,
        regraAlerta,
        rotuloIndicador,
        ...updatedFields,
      },
    });
  };

  const handleAddPergunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secaoAtual || !novoEnunciado.trim()) return;
    const nova: PerguntaItem = {
      id: Date.now(),
      codigo: novoEnunciado
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 30),
      enunciado: novoEnunciado.trim(),
      tipo: novoTipo,
      opcoes: novasOpcoes
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
      obrigatoria: true,
      condicaoExibicao: "Sempre visível",
      regraAlerta: "Nenhuma",
      rotuloIndicador: "novo_indicador",
    };
    await dispatchAction("SALVAR_PERGUNTA_FORMULARIO", {
      secaoId: secaoAtual.id,
      pergunta: nova,
    });
    selectPergunta(nova);
    setNovoEnunciado("");
    setShowAddPergunta(false);
    showToast("Pergunta adicionada à seção!");
  };

  const handleAddSecao = async () => {
    if (!canEdit) return;
    const nome = window.prompt("Título da nova seção:");
    if (!nome) return;
    await dispatchAction("ADICIONAR_SECAO_FORMULARIO", { titulo: nome });
    showToast(`Seção "${nome}" adicionada!`);
  };

  const handlePublicarV4 = async () => {
    if (!canEdit) return;
    await dispatchAction("PUBLICAR_FORMULARIO", {
      versaoNome: "v4",
      secoes,
    });
    showToast("Formulário v4 publicado e registrado na Auditoria!");
    router.push("/coleta/formularios");
  };

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Editor de formulário">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Editando: Pesquisa de Demanda Turística
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rascunho da <span className="font-bold text-slate-700">v4</span> ·
              baseada na v3 (5.012 respostas)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAppPreview(true)}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            Pré-visualizar no app
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handlePublicarV4}
              className="px-4 py-2 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold shadow-2xs transition"
            >
              Publicar v4
            </button>
          )}
        </div>
      </div>

      {/* Aviso de regra de versionamento */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2.5 mb-5 flex flex-wrap items-center gap-2 text-xs text-[#182657]">
        <span>
          Há 5.012 respostas na v3. As alterações valem só para pesquisas novas,
          a v3 não é modificada.
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-[11px] font-semibold">
          regra a validar
        </span>
      </div>

      {/* Layout em 3 colunas: SEÇÕES | SEÇÃO ATIVA | PROPRIEDADES DA PERGUNTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Coluna 1: SEÇÕES */}
        <div className="lg:col-span-3 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            SEÇÕES
          </div>

          {secoes.map((sec) => {
            const isSelected = sec.ordem === secaoAtual?.ordem;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSelectedSecaoOrdem(sec.ordem);
                  if (sec.perguntas[0]) {
                    selectPergunta(sec.perguntas[0]);
                  }
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition border ${
                  isSelected
                    ? "bg-white border-2 border-[#008767] font-bold text-[#182657] shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {sec.ordem}. {sec.titulo}
              </button>
            );
          })}

          {canEdit && (
            <button
              type="button"
              onClick={handleAddSecao}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium pt-1.5 px-1 block"
            >
              + Adicionar seção
            </button>
          )}
        </div>

        {/* Coluna 2: SEÇÃO SELECIONADA */}
        <div className="lg:col-span-6 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            SEÇÃO {secaoAtual?.ordem} · {secaoAtual?.titulo.toUpperCase()}
          </div>

          {secaoAtual?.perguntas.map((perg) => {
            const isSelected = perg.id === selectedPerguntaId;
            return (
              <button
                type="button"
                key={perg.id}
                onClick={() => selectPergunta(perg)}
                className={`w-full text-left bg-white rounded-xl p-4 cursor-pointer transition border block ${
                  isSelected
                    ? "border-2 border-[#008767] shadow-xs"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-[#182657]">
                    {perg.id === selectedPerguntaId ? texto : perg.enunciado}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                    {perg.tipo}
                  </span>
                </div>

                {perg.opcoes && perg.opcoes.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {perg.opcoes.join(" · ")}
                  </div>
                )}

                {perg.condicaoExibicao &&
                  perg.condicaoExibicao !== "Sempre visível" && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold">
                        Aparece se:{" "}
                        {perg.condicaoExibicao
                          .replace("Transporte =", "meio de transporte =")}
                      </span>
                    </div>
                  )}
              </button>
            );
          })}

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddPergunta(true)}
              className="text-left text-xs text-slate-500 hover:text-[#008767] transition block pt-1 leading-relaxed"
            >
              + Adicionar pergunta · tipos: texto, número, escolha única,
              múltipla, escala 0–10, data, cidade (IBGE), lista de avaliação
            </button>
          )}
        </div>

        {/* Coluna 3: Propriedades da pergunta */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Propriedades da pergunta
          </h2>

          <div>
            <label
              htmlFor="prop-texto"
              className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              TEXTO
            </label>
            <textarea
              id="prop-texto"
              rows={2}
              value={texto}
              disabled={!canEdit}
              onChange={(e) => {
                setTexto(e.target.value);
                void handleSavePropertyChange({ enunciado: e.target.value });
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
            />
          </div>

          <div>
            <label
              htmlFor="prop-obrigatoria"
              className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              OBRIGATÓRIA
            </label>
            <button
              id="prop-obrigatoria"
              type="button"
              disabled={!canEdit}
              onClick={() => {
                const next = !obrigatoria;
                setObrigatoria(next);
                void handleSavePropertyChange({ obrigatoria: next });
              }}
              className={`w-10 h-5 rounded-full transition relative flex items-center px-0.5 ${
                obrigatoria ? "bg-[#008767]" : "bg-slate-300"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  obrigatoria ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <label
              htmlFor="prop-condicao"
              className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              CONDIÇÃO DE EXIBIÇÃO
            </label>
            <input
              id="prop-condicao"
              type="text"
              value={condicaoExibicao}
              disabled={!canEdit}
              onChange={(e) => {
                setCondicaoExibicao(e.target.value);
                void handleSavePropertyChange({ condicaoExibicao: e.target.value });
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
            />
          </div>

          <div>
            <label
              htmlFor="prop-regra"
              className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              REGRA DE ALERTA
            </label>
            <input
              id="prop-regra"
              type="text"
              value={regraAlerta}
              disabled={!canEdit}
              onChange={(e) => {
                setRegraAlerta(e.target.value);
                void handleSavePropertyChange({ regraAlerta: e.target.value });
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Exemplo em outra pergunta:
              <br />
              idade &gt; 110 →{" "}
              <span className="font-bold text-slate-700">
                sinalizar como suspeita
              </span>
            </p>
          </div>

          <div>
            <label
              htmlFor="prop-rotulo"
              className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              RÓTULO DO INDICADOR
            </label>
            <input
              id="prop-rotulo"
              type="text"
              value={rotuloIndicador}
              disabled={!canEdit}
              onChange={(e) => {
                setRotuloIndicador(e.target.value);
                void handleSavePropertyChange({ rotuloIndicador: e.target.value });
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#008767]"
            />
          </div>
        </div>
      </div>

      {/* Modal Adicionar Pergunta */}
      {showAddPergunta && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adicionar pergunta em &ldquo;{secaoAtual?.titulo}&rdquo;
            </h3>
            <form onSubmit={handleAddPergunta} className="space-y-3 text-xs mt-3">
              <div>
                <label
                  htmlFor="novo-enunciado"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Texto da pergunta
                </label>
                <input
                  id="novo-enunciado"
                  type="text"
                  required
                  value={novoEnunciado}
                  onChange={(e) => setNovoEnunciado(e.target.value)}
                  placeholder="Ex.: Qual a faixa de renda familiar mensal?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="novo-tipo"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Tipo de pergunta
                </label>
                <select
                  id="novo-tipo"
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="escolha única">escolha única</option>
                  <option value="múltipla">múltipla</option>
                  <option value="texto">texto</option>
                  <option value="número">número</option>
                  <option value="escala 0–10">escala 0–10</option>
                  <option value="data">data</option>
                  <option value="cidade (IBGE)">cidade (IBGE)</option>
                  <option value="lista de avaliação">lista de avaliação</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="novas-opcoes"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Opções (separadas por ·)
                </label>
                <input
                  id="novas-opcoes"
                  type="text"
                  value={novasOpcoes}
                  onChange={(e) => setNovasOpcoes(e.target.value)}
                  placeholder="Até 2 salários · 2 a 3 salários · 3 a 5 salários · 5 a 10 salários"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPergunta(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pré-visualizar no App Mobile (UC07) */}
      {showAppPreview && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-[#182657] shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-[#182657] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold">
                  OTO App Mobile · Seção {secaoAtual?.ordem}/
                  {secoes.length}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Offline pronto
              </span>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${((secaoAtual?.ordem || 1) / secoes.length) * 100}%`,
                  }}
                  className="h-full bg-[#008767]"
                />
              </div>

              <h3 className="text-sm font-bold text-[#182657]">
                {secaoAtual?.ordem}. {secaoAtual?.titulo}
              </h3>

              {secaoAtual?.perguntas.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="text-xs font-bold text-slate-900">
                    {q.enunciado}{" "}
                    {q.obrigatoria && <span className="text-rose-600">*</span>}
                  </div>
                  {q.opcoes && q.opcoes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {q.opcoes.map((op) => (
                        <span
                          key={op}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-800"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled
                      placeholder={`Campo (${q.tipo})`}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppPreview(false)}
                  className="w-full py-2.5 rounded-xl bg-[#008767] text-white text-xs font-bold"
                >
                  Fechar pré-visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default function EditorFormularioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs">Carregando editor...</div>}>
      <EditorFormularioContent />
    </Suspense>
  );
}
