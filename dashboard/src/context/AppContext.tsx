"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  AnalyticsFilters,
  FormularioItem,
  PesquisaColetada,
  OperadorCampo,
  ItemRevisao,
  ItemPublicacao,
  ProblemaImportacao,
  UsuarioSistema,
  RegistroAuditoria,
} from "@/lib/mockAndSeedData";
import { getFilteredAnalytics } from "@/lib/mockAndSeedData";
import { downloadExcelXml } from "@/lib/excel";

export type UserRole = "Administradora" | "Gestor" | "Editor" | "Visualizador";

export interface CurrentUser {
  nome: string;
  email: string;
  papel: UserRole;
  iniciais: string;
}

export const PERFIS_DISPONIVEIS: CurrentUser[] = [
  {
    nome: "Maria Oliveira",
    email: "maria.oliveira@exemplo.com",
    papel: "Administradora",
    iniciais: "M",
  },
  {
    nome: "Coordenação OTO",
    email: "coordenacao@oto.olimpia.sp.gov.br",
    papel: "Gestor",
    iniciais: "C",
  },
  {
    nome: "Estagiária OTO",
    email: "estagio@oto.olimpia.sp.gov.br",
    papel: "Editor",
    iniciais: "E",
  },
  {
    nome: "Secretaria / Prefeito",
    email: "visualizador@olimpia.sp.gov.br",
    papel: "Visualizador",
    iniciais: "V",
  },
];

interface AppContextValue {
  currentUser: CurrentUser;
  setCurrentUser: (u: CurrentUser) => void;
  canEdit: boolean;
  canManageUsers: boolean;
  filters: Required<AnalyticsFilters>;
  setFilter: (key: keyof AnalyticsFilters, value: string) => void;
  resetFilters: (defaultPeriodo?: string) => void;
  analytics: ReturnType<typeof getFilteredAnalytics>;
  dbConnected: boolean;
  pendentesRevisao: number;
  formularios: FormularioItem[];
  pesquisas: PesquisaColetada[];
  operadores: OperadorCampo[];
  revisao: ItemRevisao[];
  publicacaoItens: ItemPublicacao[];
  ultimaPublicacao: string;
  metodoPublicacao: string;
  problemasImportacao: ProblemaImportacao[];
  importacaoConcluida: boolean;
  usuarios: UsuarioSistema[];
  auditoria: RegistroAuditoria[];
  dispatchAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  exportToExcel: (sheetName: string, rows: Record<string, unknown>[], fileName: string) => void;
  exportReportPdfOrExcel: (abaTitulo: string, formato?: "PDF" | "XLSX") => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const defaultFilters: Required<AnalyticsFilters> = {
  periodo: "Outubro de 2026",
  genero: "Todos",
  faixaIdade: "Todas",
  cidade: "Todas",
  hospedagem: "Todas",
  transporte: "Todos",
  localPesquisa: "Todos",
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(PERFIS_DISPONIVEIS[0]);
  const [filters, setFilters] = useState<Required<AnalyticsFilters>>(defaultFilters);
  const [dbConnected, setDbConnected] = useState(false);
  const [pendentesRevisao, setPendentesRevisao] = useState(7);
  const [formularios, setFormularios] = useState<FormularioItem[]>([]);
  const [pesquisas, setPesquisas] = useState<PesquisaColetada[]>([]);
  const [operadores, setOperadores] = useState<OperadorCampo[]>([]);
  const [revisao, setRevisao] = useState<ItemRevisao[]>([]);
  const [publicacaoItens, setPublicacaoItens] = useState<ItemPublicacao[]>([]);
  const [ultimaPublicacao, setUltimaPublicacao] = useState("Nenhuma");
  const [metodoPublicacao, setMetodoPublicacao] = useState("Incorporar no site (iframe/link)");
  const [problemasImportacao, setProblemasImportacao] = useState<ProblemaImportacao[]>([]);
  const [importacaoConcluida, setImportacaoConcluida] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setDbConnected(Boolean(data.dbConnected));
      setPendentesRevisao(data.pendentesRevisao ?? 7);
      setFormularios(data.formularios || []);
      setPesquisas(data.pesquisas || []);
      setOperadores(data.operadores || []);
      setRevisao(data.revisao || []);
      setPublicacaoItens(data.publicacaoItens || []);
      setUltimaPublicacao(data.ultimaPublicacao || "Nenhuma");
      setMetodoPublicacao(data.metodoPublicacao || "Incorporar no site (iframe/link)");
      setProblemasImportacao(data.problemasImportacao || []);
      setImportacaoConcluida(Boolean(data.importacaoConcluida));
      setUsuarios(data.usuarios || []);
      setAuditoria(data.auditoria || []);
    } catch {
      // ignore initial fetch error
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const dispatchAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload,
          usuario: currentUser.nome,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPendentesRevisao(data.pendentesRevisao ?? 0);
        setFormularios(data.formularios || []);
        setPesquisas(data.pesquisas || []);
        setOperadores(data.operadores || []);
        setRevisao(data.revisao || []);
        setPublicacaoItens(data.publicacaoItens || []);
        setUltimaPublicacao(data.ultimaPublicacao || "Nenhuma");
        setMetodoPublicacao(data.metodoPublicacao || "Incorporar no site (iframe/link)");
        setProblemasImportacao(data.problemasImportacao || []);
        setImportacaoConcluida(Boolean(data.importacaoConcluida));
        setUsuarios(data.usuarios || []);
        setAuditoria(data.auditoria || []);
      }
    },
    [currentUser.nome]
  );

  const setFilter = useCallback((key: keyof AnalyticsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback((defaultPeriodo = "Outubro de 2026") => {
    setFilters({
      ...defaultFilters,
      periodo: defaultPeriodo,
    });
  }, []);

  const analytics = getFilteredAnalytics(filters);

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

      const rows = [
        {
          Painel: abaTitulo,
          Periodo: filters.periodo,
          Genero: filters.genero,
          Faixa_Idade: filters.faixaIdade,
          Cidade: filters.cidade,
          Hospedagem: filters.hospedagem,
          Transporte: filters.transporte,
          Local_Pesquisa: filters.localPesquisa,
          Pesquisas_Consideradas: analytics.panorama.pesquisasColetadas,
          Permanencia_Media_Noites: analytics.panorama.permanenciaMedia,
          NPS: analytics.panorama.nps,
          Gasto_Diario_Medio_BRL: analytics.impactoEconomico.gastoDiarioMedio,
        },
      ];
      exportToExcel(
        "Consolidado OTO",
        rows,
        `OTO_Relatorio_${abaTitulo.toLowerCase().replace(/\s+/g, "_")}.xlsx`
      );
    },
    [analytics, exportToExcel, filters, showToast]
  );

  const canEdit = currentUser.papel !== "Visualizador";
  const canManageUsers = currentUser.papel === "Administradora";

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        canEdit,
        canManageUsers,
        filters,
        setFilter,
        resetFilters,
        analytics,
        dbConnected,
        pendentesRevisao,
        formularios,
        pesquisas,
        operadores,
        revisao,
        publicacaoItens,
        ultimaPublicacao,
        metodoPublicacao,
        problemasImportacao,
        importacaoConcluida,
        usuarios,
        auditoria,
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
