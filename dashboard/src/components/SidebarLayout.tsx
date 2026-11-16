"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  BarChart2,
  ClipboardList,
  Sliders,
  ChevronsUpDown,
  Database,
} from "lucide-react";
import { useApp, PERFIS_DISPONIVEIS } from "@/context/AppContext";

interface NavChild {
  label: string;
  href: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: NavChild[];
}

export function SidebarLayout({
  breadcrumb,
  children,
}: {
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    currentUser,
    setCurrentUser,
    pendentesRevisao,
    dbConnected,
    toastMessage,
    showToast,
  } = useApp();

  const [menuQuery, setMenuQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    analises: true,
    coleta: true,
    sistema: true,
  });
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const navGroups: NavGroup[] = [
    {
      id: "analises",
      label: "Análises",
      icon: <BarChart2 className="w-4 h-4" />,
      children: [
        { label: "Panorama", href: "/analises/panorama" },
        { label: "Infraestrutura", href: "/analises/infraestrutura" },
        { label: "Impacto econômico", href: "/analises/impacto-economico" },
        { label: "Perfil do turista", href: "/analises/perfil-turista" },
        { label: "Atrações", href: "/analises/atracoes" },
      ],
    },
    {
      id: "coleta",
      label: "Coleta",
      icon: <ClipboardList className="w-4 h-4" />,
      children: [
        { label: "Visão geral", href: "/coleta/visao-geral" },
        { label: "Formulários", href: "/coleta/formularios" },
        { label: "Pesquisas", href: "/coleta/pesquisas" },
        { label: "Operadores", href: "/coleta/operadores" },
        { label: "Revisão", href: "/coleta/revisao", badge: pendentesRevisao },
      ],
    },
    {
      id: "sistema",
      label: "Sistema",
      icon: <Sliders className="w-4 h-4" />,
      children: [
        { label: "Publicação", href: "/sistema/publicacao" },
        { label: "Importação", href: "/sistema/importacao" },
        { label: "Usuários", href: "/sistema/usuarios" },
        { label: "Auditoria", href: "/sistema/auditoria" },
      ],
    },
  ];

  const activeGroupId = pathname.startsWith("/coleta")
    ? "coleta"
    : pathname.startsWith("/sistema")
    ? "sistema"
    : "analises";

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900">
      {/* Sidebar fixa azul-marinho fiel ao PDF OTO – Painel Web */}
      <aside className="w-[244px] shrink-0 bg-[#182657] text-white flex flex-col justify-between select-none print:hidden">
        <div className="p-3.5 space-y-4">
          {/* Logo OTO no topo */}
          <Link href="/analises/panorama" className="block">
            <div className="bg-white rounded-xl px-3.5 py-2.5 inline-flex items-center w-full shadow-sm">
              <span className="text-[20px] font-extrabold tracking-tight text-[#182657] leading-none">
                OT
              </span>
              <span className="text-[20px] font-extrabold tracking-tight text-[#008767] leading-none relative">
                O
                <span className="absolute -bottom-0.5 right-0 w-1.5 h-1 bg-[#f59e0b] rounded-full" />
              </span>
            </div>
          </Link>

          <div className="px-0.5 space-y-1">
            <div className="text-[13px] font-bold leading-snug text-white">
              Observatório de
              <br />
              Turismo de Olímpia
            </div>
            <div className="text-[10px] tracking-wider uppercase text-slate-300 font-medium">
              INTELIGÊNCIA TURÍSTICA
            </div>

            {/* Barra de 5 cores da identidade visual OTO */}
            <div className="grid grid-cols-5 gap-1 pt-2">
              <div className="h-1 rounded-full bg-[#009b72]" />
              <div className="h-1 rounded-full bg-[#f59e0b]" />
              <div className="h-1 rounded-full bg-[#ef4444]" />
              <div className="h-1 rounded-full bg-[#3b82f6]" />
              <div className="h-1 rounded-full bg-[#10b981]" />
            </div>
          </div>

          {/* Campo Filtrar menu... */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Filtrar menu..."
              className="w-full bg-[#1f3068] border border-[#2f4385] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* Navegação */}
          <div className="space-y-1 pt-1">
            <div className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase pb-1">
              NAVEGAÇÃO
            </div>

            {navGroups.map((group) => {
              const filteredChildren = group.children.filter((c) =>
                c.label.toLowerCase().includes(menuQuery.toLowerCase())
              );
              if (menuQuery && filteredChildren.length === 0) return null;

              const isExpanded =
                Boolean(menuQuery) || openGroups[group.id] || activeGroupId === group.id;
              const isGroupActive = activeGroupId === group.id;

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-semibold transition ${
                      isGroupActive
                        ? "bg-[#253773] text-white"
                        : "text-slate-200 hover:bg-[#213168]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {group.icon}
                      <span>{group.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {isExpanded ? "◣" : "◤"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 pl-3 border-l border-[#2e4282] space-y-0.5 py-1">
                      {filteredChildren.map((child) => {
                        const isChildActive =
                          pathname === child.href ||
                          (child.href === "/coleta/formularios" &&
                            pathname.startsWith("/coleta/formularios"));
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition ${
                              isChildActive
                                ? "font-bold text-white bg-[#23366e]/70"
                                : "text-slate-300 hover:text-white hover:bg-[#213168]/50"
                            }`}
                          >
                            <span>{child.label}</span>
                            {typeof child.badge === "number" && child.badge > 0 && (
                              <span className="bg-[#fef08a] text-amber-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé do usuário e alternador de perfil (RF01) */}
        <div className="p-3 border-t border-[#293b75] relative">
          {showRoleMenu && (
            <div className="absolute bottom-16 left-3 right-3 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                Alternar perfil de acesso (RF01)
              </div>
              {PERFIS_DISPONIVEIS.map((p) => (
                <button
                  key={p.papel}
                  type="button"
                  onClick={() => {
                    setCurrentUser(p);
                    setShowRoleMenu(false);
                    showToast(`Perfil alterado para: ${p.nome} (${p.papel})`);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    currentUser.papel === p.papel
                      ? "bg-teal-50 text-teal-900 font-bold"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span>{p.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.papel}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowRoleMenu((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-[#23366e] transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#008767] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.iniciais}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.nome}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {currentUser.email}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <main className="flex-1 min-w-0 p-6 lg:p-7 max-w-[1440px]">
        {/* Barra superior: Breadcrumb à esquerda e badge de usuário à direita */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="text-xs text-slate-500 font-medium">{breadcrumb}</div>
          <div className="flex items-center gap-2">
            <span
              title={
                dbConnected
                  ? "Conectado ao PostgreSQL (oto-db)"
                  : "Modo resiliente ativo (dados sincronizados com o modelo oto-db)"
              }
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600"
            >
              <Database
                className={`w-3 h-3 ${
                  dbConnected ? "text-emerald-600" : "text-teal-600"
                }`}
              />
              <span>{dbConnected ? "PostgreSQL (oto-db)" : "Base OTO ativa"}</span>
            </span>
            <div className="inline-flex items-center px-3.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs">
              {currentUser.nome} · {currentUser.papel}
            </div>
          </div>
        </div>

        {children}

        {/* Notificação flutuante */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#182657] text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
