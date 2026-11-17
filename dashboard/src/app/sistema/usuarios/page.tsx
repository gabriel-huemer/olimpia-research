"use client";

import React, { useState } from "react";
import { UserCog, CornerDownRight } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";
import type { UsuarioSistema } from "@/lib/mockAndSeedData";

export default function UsuariosPage() {
  const { usuarios, dispatchAction, canManageUsers, showToast } = useApp();

  const [showNewModal, setShowNewModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerfil, setNovoPerfil] =
    useState<UsuarioSistema["perfil"]>("Gestor");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await dispatchAction("CRIAR_USUARIO", {
      nome: novoNome.trim(),
      email: novoEmail.trim(),
      perfil: novoPerfil,
    });
    setNovoNome("");
    setNovoEmail("");
    setShowNewModal(false);
    showToast("Novo usuário criado e registrado na Auditoria!");
  };

  const handleToggleStatus = async (u: UsuarioSistema) => {
    if (!canManageUsers) {
      showToast("Somente o perfil Administrador pode gerenciar usuários (RF01).");
      return;
    }
    const novoStatus = u.status === "Ativo" ? "Inativo" : "Ativo";
    await dispatchAction("ATUALIZAR_USUARIO", {
      id: u.id,
      status: novoStatus,
    });
    showToast(`Status de ${u.nome} alterado para ${novoStatus}.`);
  };

  const permissoesMatriz: Array<[string, string, string, string, string]> = [
    ["Criar/editar formulários", "✓", "✓", "—", "—"],
    ["Revisar respostas", "✓", "✓", "—", "—"],
    ["Inserir resposta manual", "✓", "✓", "✓", "—"],
    ["Publicar no site", "✓", "✓", "—", "—"],
    ["Gerenciar usuários", "✓", "—", "—", "—"],
    ["Coletar em campo", "—", "—", "—", "✓"],
  ];

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Usuários e perfis">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Usuários
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quem acessa o sistema e o que pode fazer.
            </p>
          </div>
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold shadow-2xs transition"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Novo usuário</span>
          </button>
        )}
      </div>

      {/* Duas colunas: Lista de usuários + Matriz de Permissões */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Lista de usuários */}
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
                {usuarios.map((u) => (
                  <tr key={u.id} className="text-[#182657]">
                    <td className="py-3.5 font-medium">{u.nome}</td>
                    <td className="py-3.5">{u.perfil}</td>
                    <td className="py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        title="Clique para alternar status Ativo/Inativo"
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          u.status === "Ativo"
                            ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {u.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matriz de Permissões */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Permissões</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-[11px] font-semibold">
              proposta
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2"></th>
                  <th className="py-2 text-center">Adm</th>
                  <th className="py-2 text-center">Gestor</th>
                  <th className="py-2 text-center">Editor</th>
                  <th className="py-2 text-center">Pesq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {permissoesMatriz.map(([funcao, adm, gestor, editor, pesq]) => (
                  <tr key={funcao} className="text-[#182657]">
                    <td className="py-3 pr-2 font-medium">{funcao}</td>
                    <td className="py-3 text-center">{adm}</td>
                    <td className="py-3 text-center">{gestor}</td>
                    <td className="py-3 text-center">{editor}</td>
                    <td className="py-3 text-center">{pesq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Novo Usuário */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Novo usuário (UC10)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cria um novo acesso ao sistema de acordo com a matriz de perfis.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="novo-usuario-nome"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Nome
                </label>
                <input
                  id="novo-usuario-nome"
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Daniel (Secretaria)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="novo-usuario-email"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  E-mail
                </label>
                <input
                  id="novo-usuario-email"
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="daniel@olimpia.sp.gov.br"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="novo-usuario-perfil"
                  className="block font-semibold text-slate-600 uppercase mb-1"
                >
                  Perfil de acesso
                </label>
                <select
                  id="novo-usuario-perfil"
                  value={novoPerfil}
                  onChange={(e) =>
                    setNovoPerfil(
                      e.target.value as UsuarioSistema["perfil"]
                    )
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Editor">Editor</option>
                  <option value="Pesquisador">Pesquisador</option>
                  <option value="Visualizador">Visualizador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#008767] text-white font-semibold"
                >
                  Criar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
