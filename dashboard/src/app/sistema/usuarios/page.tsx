"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserCog, CornerDownRight, ShieldPlus, Lock } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

type Areas = { analises: boolean; coleta: boolean; sistema: boolean };
interface Perfil {
  id: number;
  nome: string;
  padrao: boolean;
  areas: Areas;
  usuarios: number;
}
interface Usuario {
  id: string;
  nome: string;
  email: string | null;
  codigoAcesso: string | null;
  ativo: boolean;
  perfil: { id: number; nome: string };
}

const ROTULO_AREA: Record<keyof Areas, string> = { analises: "Análises", coleta: "Coleta", sistema: "Sistema" };
const AREAS = Object.keys(ROTULO_AREA) as (keyof Areas)[];

async function chamar(url: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.erro ?? "Não foi possível concluir a ação.");
  return d;
}

export default function UsuariosPage() {
  const { currentUser, showToast } = useApp();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modal, setModal] = useState<"usuario" | "perfil" | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPerfilId, setNovoPerfilId] = useState<number>(3);
  const [nomePerfil, setNomePerfil] = useState("");
  const [areasPerfil, setAreasPerfil] = useState<Areas>({ analises: true, coleta: false, sistema: false });

  const carregar = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([chamar("/api/admin/perfis"), chamar("/api/admin/usuarios")]);
      setPerfis(p.perfis);
      setUsuarios(u.usuarios);
    } catch (e) {
      showToast((e as Error).message);
    }
  }, [showToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      showToast(ok);
      await carregar();
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroModal(null);
    try {
      await chamar("/api/admin/usuarios", "POST", {
        nome: novoNome.trim(),
        email: novoEmail.trim(),
        senha: novaSenha,
        perfilId: novoPerfilId,
      });
      setNovoNome("");
      setNovoEmail("");
      setNovaSenha("");
      setModal(null);
      showToast("Usuário criado. Passe a senha inicial para a pessoa por um canal seguro.");
      await carregar();
    } catch (err) {
      setErroModal((err as Error).message);
    }
  };

  const criarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroModal(null);
    try {
      await chamar("/api/admin/perfis", "POST", { nome: nomePerfil.trim(), areas: areasPerfil });
      setNomePerfil("");
      setAreasPerfil({ analises: true, coleta: false, sistema: false });
      setModal(null);
      showToast("Perfil criado.");
      await carregar();
    } catch (err) {
      setErroModal((err as Error).message);
    }
  };

  const perfisWeb = perfis.filter((p) => p.nome !== "PESQUISADOR");

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Usuários e perfis">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Usuários e perfis</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quem acessa o painel e quais áreas cada perfil enxerga. Análises é sempre pública.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setErroModal(null);
              setModal("perfil");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition"
          >
            <ShieldPlus className="w-3.5 h-3.5" />
            <span>Novo perfil</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setErroModal(null);
              setModal("usuario");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold shadow-2xs transition"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Novo usuário</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Usuários */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2.5">Nome</th>
                  <th className="py-2.5">Perfil</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {usuarios.map((u) => {
                  const pesquisador = u.perfil.nome === "PESQUISADOR";
                  const souEu = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="text-[#182657]">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{u.nome}</div>
                        <div className="text-[11px] text-slate-500">
                          {u.email ?? `código ${u.codigoAcesso} (app)`}
                          {souEu && " · você"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {pesquisador ? (
                          <span className="text-xs text-slate-600">Pesquisador (app)</span>
                        ) : (
                          <select
                            aria-label={`Perfil de ${u.nome}`}
                            value={u.perfil.id}
                            disabled={souEu}
                            onChange={(e) =>
                              void executar(
                                () => chamar(`/api/admin/usuarios/${u.id}`, "PATCH", { perfilId: Number(e.target.value) }),
                                `Perfil de ${u.nome} atualizado.`
                              )
                            }
                            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white disabled:opacity-60"
                          >
                            {perfisWeb.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          disabled={souEu}
                          onClick={() =>
                            void executar(
                              () => chamar(`/api/admin/usuarios/${u.id}`, "PATCH", { ativo: !u.ativo }),
                              `${u.nome} ${u.ativo ? "desativado" : "reativado"}.`
                            )
                          }
                          title={souEu ? "Você não pode desativar a si mesmo" : "Alternar Ativo/Inativo"}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition disabled:cursor-not-allowed ${
                            u.ativo
                              ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {u.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Perfis e áreas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Perfis de acesso</h2>
          <p className="text-[11px] text-slate-500 mb-3">
            Perfis padrão são fixos. Nos perfis criados aqui, marque as áreas que eles enxergam; vale na hora.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2">Perfil</th>
                  {AREAS.map((a) => (
                    <th key={a} className="py-2 text-center">
                      {ROTULO_AREA[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {perfis.map((p) => (
                  <tr key={p.id} className="text-[#182657]">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium flex items-center gap-1.5">
                        {p.padrao && <Lock className="w-3 h-3 text-slate-400" aria-label="perfil padrão" />}
                        {p.nome}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.usuarios} usuário{p.usuarios === 1 ? "" : "s"}
                      </div>
                    </td>
                    {AREAS.map((a) => (
                      <td key={a} className="py-2.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${p.nome}: ${ROTULO_AREA[a]}`}
                          checked={p.areas[a]}
                          disabled={p.padrao}
                          onChange={(e) =>
                            void executar(
                              () =>
                                chamar(`/api/admin/perfis/${p.id}`, "PATCH", {
                                  areas: { ...p.areas, [a]: e.target.checked },
                                }),
                              `Perfil ${p.nome} atualizado.`
                            )
                          }
                          className="w-4 h-4 accent-[#008767] disabled:opacity-60"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            {modal === "usuario" ? (
              <>
                <h2 className="text-base font-bold text-slate-900 mb-1">Novo usuário do painel</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Pesquisadores de campo usam o app com código de acesso e não são criados aqui.
                </p>
                <form onSubmit={criarUsuario} className="space-y-3 text-xs">
                  <Campo id="nu-nome" rotulo="Nome">
                    <input id="nu-nome" required value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
                  </Campo>
                  <Campo id="nu-email" rotulo="E-mail">
                    <input id="nu-email" type="email" required value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
                  </Campo>
                  <Campo id="nu-senha" rotulo="Senha inicial">
                    <input id="nu-senha" type="password" autoComplete="new-password" required minLength={10} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
                    <p className="text-[11px] text-slate-500 mt-1">Mínimo de 10 caracteres, com letras e números.</p>
                  </Campo>
                  <Campo id="nu-perfil" rotulo="Perfil">
                    <select id="nu-perfil" value={novoPerfilId} onChange={(e) => setNovoPerfilId(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white">
                      {perfisWeb.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <RodapeModal erro={erroModal} onCancelar={() => setModal(null)} acao="Criar usuário" />
                </form>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-slate-900 mb-1">Novo perfil de acesso</h2>
                <p className="text-xs text-slate-500 mb-4">Escolha as áreas do painel que este perfil enxerga.</p>
                <form onSubmit={criarPerfil} className="space-y-3 text-xs">
                  <Campo id="np-nome" rotulo="Nome do perfil">
                    <input id="np-nome" required maxLength={60} value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} placeholder="Ex.: Estagiário" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
                  </Campo>
                  <fieldset className="space-y-1.5">
                    <legend className="block font-semibold text-slate-600 uppercase mb-1">Áreas</legend>
                    {AREAS.map((a) => (
                      <label key={a} className="flex items-center gap-2 text-slate-800">
                        <input
                          type="checkbox"
                          checked={areasPerfil[a]}
                          onChange={(e) => setAreasPerfil((v) => ({ ...v, [a]: e.target.checked }))}
                          className="w-4 h-4 accent-[#008767]"
                        />
                        {ROTULO_AREA[a]}
                      </label>
                    ))}
                  </fieldset>
                  <RodapeModal erro={erroModal} onCancelar={() => setModal(null)} acao="Criar perfil" />
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-slate-600 uppercase mb-1">
        {rotulo}
      </label>
      {children}
    </div>
  );
}

function RodapeModal({ erro, onCancelar, acao }: { erro: string | null; onCancelar: () => void; acao: string }) {
  return (
    <>
      {erro && (
        <p role="alert" className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} className="px-3.5 py-2 rounded-lg border border-slate-200 font-semibold">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold">
          {acao}
        </button>
      </div>
    </>
  );
}
