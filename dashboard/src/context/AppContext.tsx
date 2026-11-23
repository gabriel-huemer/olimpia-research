"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  FormularioItem,
  ItemPublicacao,
} from "@/lib/mockAndSeedData";
import { usePathname } from "next/navigation";
import { abaDaRota, paineisVazios, type AnalyticsFilters, type OpcoesFiltro, type Paineis } from "@/lib/paineis-types";
import { linhasDaAba } from "@/lib/exportacao";
import { ROTA_LOGIN } from "@/lib/auth/origem";
import { downloadExcelXml } from "@/lib/excel";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: { id: number; nome: string };
  areas: { analises: boolean; coleta: boolean; sistema: boolean };
}

interface AppContextValue {
  /** null = visitante (só Análises). */
  currentUser: UsuarioLogado | null;
  sessaoCarregada: boolean;
  sair: () => Promise<void>;
  canEdit: boolean;
  canManageUsers: boolean;
  filters: Required<AnalyticsFilters>;
  setFilter: (key: keyof AnalyticsFilters, value: string) => void;
  resetFilters: (defaultPeriodo?: string) => void;
  paineis: Paineis;
  opcoesFiltro: OpcoesFiltro;
  erroAnalises: string | null;
  dbConnected: boolean;
  pendentesRevisao: number;
  formularios: FormularioItem[];
  publicacaoItens: ItemPublicacao[];
  ultimaPublicacao: string;
  metodoPublicacao: string;
  /** Relê /api/state agora, sem esperar os 15 s. */
  recarregarEstado: () => Promise<void>;
  dispatchAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  exportToExcel: (sheetName: string, rows: Record<string, unknown>[], fileName: string) => void;
  exportReportPdfOrExcel: (abaTitulo: string, formato?: "PDF" | "XLSX") => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const defaultFilters: Required<AnalyticsFilters> = {
  periodo: "Mês atual",
  genero: "Todos",
  faixaIdade: "Todas",
  cidade: "Todas",
  hospedagem: "Todas",
  transporte: "Todos",
  localPesquisa: "Todos",
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UsuarioLogado | null>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);
  const [filters, setFilters] = useState<Required<AnalyticsFilters>>(defaultFilters);
  const [dbConnected, setDbConnected] = useState(false);
  const [pendentesRevisao, setPendentesRevisao] = useState(0);
  const [formularios, setFormularios] = useState<FormularioItem[]>([]);
  const [publicacaoItens, setPublicacaoItens] = useState<ItemPublicacao[]>([]);
  const [ultimaPublicacao, setUltimaPublicacao] = useState("Nenhuma");
  const [metodoPublicacao, setMetodoPublicacao] = useState("Incorporar no site (iframe/link)");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const applyServerState = useCallback((data: Record<string, unknown>) => {
    if ("dbConnected" in data) {
      setDbConnected(Boolean(data.dbConnected));
    }
    setPendentesRevisao(typeof data.pendentesRevisao === "number" ? data.pendentesRevisao : 0);
    setFormularios((data.formularios as FormularioItem[]) || []);
    setPublicacaoItens((data.publicacaoItens as ItemPublicacao[]) || []);
    setUltimaPublicacao((data.ultimaPublicacao as string) || "Nenhuma");
    setMetodoPublicacao(
      (data.metodoPublicacao as string) || "Incorporar no site (iframe/link)"
    );
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      applyServerState(data);
    } catch {
      // ignore initial fetch error
    }
  }, [applyServerState]);

  useEffect(() => {
    fetch("/api/auth/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCurrentUser(d?.usuario ?? null))
      .catch(() => setCurrentUser(null))
      .finally(() => setSessaoCarregada(true));
  }, []);

  // Coleta e Sistema só existem para quem tem acesso; visitante não consulta /api/state.
  const usaEstado = Boolean(currentUser?.areas.coleta || currentUser?.areas.sistema);
  useEffect(() => {
    if (!usaEstado) return;
    void fetchState();
    // Atualiza sozinho: pesquisas novas enviadas pelo app aparecem sem recarregar a página
    const timer = setInterval(() => void fetchState(), 15000);
    return () => clearInterval(timer);
  }, [fetchState, usaEstado]);

  const sair = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setCurrentUser(null);
    window.location.href = "/analises/panorama";
  }, []);

  const dispatchAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      if (res.status === 401) {
        window.location.href = `${ROTA_LOGIN}?proximo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        applyServerState(data);
      } else {
        const d = await res.json().catch(() => null);
        showToast(d?.erro ?? "Não foi possível concluir a ação.");
      }
    },
    [applyServerState, showToast]
  );

  const setFilter = useCallback((key: keyof AnalyticsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback((defaultPeriodo = "Mês atual") => {
    setFilters({
      ...defaultFilters,
      periodo: defaultPeriodo,
    });
  }, []);

  // Análises: só a aba aberta é calculada, e relida a cada 15 s (também para visitantes).
  const pathname = usePathname();
  const aba = abaDaRota(pathname);
  const [paineis, setPaineis] = useState<Paineis>(paineisVazios);
  const [opcoesFiltro, setOpcoesFiltro] = useState<OpcoesFiltro>({ periodos: [], generos: [], cidades: [], locais: [] });
  const [erroAnalises, setErroAnalises] = useState<string | null>(null);
  const [atualizacao, setAtualizacao] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setAtualizacao((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!aba) return;
    const controller = new AbortController();
    const qs = new URLSearchParams({ ...filters, aba }).toString();
    fetch(`/api/analytics?${qs}`, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.erro ?? "Erro");
        setPaineis((p) => ({ ...p, [aba]: d[aba] }));
        if (d.opcoes) setOpcoesFiltro(d.opcoes);
        setDbConnected(Boolean(d.dbConnected));
        setErroAnalises(d.dbConnected ? null : "Sem conexão com o banco de dados.");
      })
      .catch(() => {
        if (!controller.signal.aborted) setErroAnalises("Não foi possível atualizar os dados. Nova tentativa em 15 segundos.");
      });
    return () => controller.abort();
  }, [aba, filters, atualizacao]);

  const exportToExcel = useCallback(
    (sheetName: string, rows: Record<string, unknown>[], fileName: string) => {
      downloadExcelXml(sheetName, rows, fileName);
      showToast(`Arquivo ${fileName} exportado com sucesso!`);
    },
    [showToast]
  );

  const exportReportPdfOrExcel = useCallback(
    (abaTitulo: string, formato: "PDF" | "XLSX" = "XLSX") => {
      if (formato === "PDF") {
        showToast(`Preparando impressão/PDF de "${abaTitulo}" com os filtros atuais...`);
        setTimeout(() => window.print(), 250);
        return;
      }

      if (!aba) return;
      const rows = linhasDaAba(aba, paineis, filters);

      const safeSlug = abaTitulo
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "_")
        .replaceAll(/^_|_$/g, "");

      exportToExcel(abaTitulo, rows, `OTO_Relatorio_${safeSlug}.xlsx`);
    },
    [aba, paineis, exportToExcel, filters, showToast]
  );

  // As páginas de Coleta/Sistema já são barradas pelo proxy; aqui só ajustamos os botões.
  const canEdit = usaEstado;
  const canManageUsers = Boolean(currentUser?.areas.sistema);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        sessaoCarregada,
        sair,
        canEdit,
        canManageUsers,
        filters,
        setFilter,
        resetFilters,
        paineis,
        opcoesFiltro,
        erroAnalises,
        dbConnected,
        pendentesRevisao,
        formularios,
        publicacaoItens,
        ultimaPublicacao,
        metodoPublicacao,
        recarregarEstado: fetchState,
        dispatchAction,
        exportToExcel,
        exportReportPdfOrExcel,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
