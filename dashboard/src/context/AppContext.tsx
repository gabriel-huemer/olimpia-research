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
  RegistroAuditoria,
} from "@/lib/mockAndSeedData";
import { getFilteredAnalytics } from "@/lib/mockAndSeedData";
import { downloadExcelXml } from "@/lib/excel";
import { panoramaVazio, type PanoramaDados } from "@/lib/panorama-types";

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
  analytics: Omit<ReturnType<typeof getFilteredAnalytics>, "panorama"> & { panorama: PanoramaDados };
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
  auditoria: RegistroAuditoria[];
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
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
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
    setPesquisas((data.pesquisas as PesquisaColetada[]) || []);
    setOperadores((data.operadores as OperadorCampo[]) || []);
    setRevisao((data.revisao as ItemRevisao[]) || []);
    setPublicacaoItens((data.publicacaoItens as ItemPublicacao[]) || []);
    setUltimaPublicacao((data.ultimaPublicacao as string) || "Nenhuma");
    setMetodoPublicacao(
      (data.metodoPublicacao as string) || "Incorporar no site (iframe/link)"
    );
    setProblemasImportacao((data.problemasImportacao as ProblemaImportacao[]) || []);
    setImportacaoConcluida(Boolean(data.importacaoConcluida));
    setAuditoria((data.auditoria as RegistroAuditoria[]) || []);
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
        window.location.href = `/login?proximo=${encodeURIComponent(window.location.pathname)}`;
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

  // Panorama: vem do banco. As demais abas ainda usam dados de exemplo até serem migradas.
  const [panorama, setPanorama] = useState<PanoramaDados>(panoramaVazio);
  // Relê o Panorama a cada 15s também para visitantes (que não consultam /api/state).
  const [atualizacao, setAtualizacao] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setAtualizacao((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    fetch(`/api/analytics?${qs}`, { cache: "no-store", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.panorama) setPanorama(d.panorama);
        if (typeof d?.dbConnected === "boolean") setDbConnected(d.dbConnected);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [filters, pesquisas.length, atualizacao]);
  const analytics = { ...getFilteredAnalytics(filters), panorama };

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

      const baseMeta = {
        Painel: abaTitulo,
        Periodo: filters.periodo,
        Genero: filters.genero,
        Faixa_Idade: filters.faixaIdade,
        Cidade: filters.cidade,
        Hospedagem: filters.hospedagem,
        Transporte: filters.transporte,
        Local_Pesquisa: filters.localPesquisa,
      };

      let rows: Record<string, unknown>[] = [];
      const lower = abaTitulo.toLowerCase();

      if (lower.includes("infraestrutura")) {
        rows = analytics.infraestrutura.servicos.map((s) => ({
          ...baseMeta,
          Servico_Avaliado: s.nome,
          Nota_Media_1_a_5: s.nota,
          Meta: 3.0,
          Expectativa_Superou_Pct: analytics.infraestrutura.expectativa.superou,
          Expectativa_Atendeu_Pct: analytics.infraestrutura.expectativa.atendeu,
          Grupos_PcD_Pct: analytics.infraestrutura.gruposPcd,
        }));
      } else if (lower.includes("impacto")) {
        rows = analytics.impactoEconomico.gastoPorRenda.map((g) => ({
          ...baseMeta,
          Faixa_Renda: g.faixa,
          Gasto_Diario_Medio_BRL: g.valor,
          Gasto_Geral_Ponderado_BRL: analytics.impactoEconomico.gastoDiarioMedio,
          Renda_Mais_Comum: analytics.impactoEconomico.rendaMaisComum,
          Antecedencia_Media_Dias: analytics.impactoEconomico.antecedenciaMediaDias,
        }));
      } else if (lower.includes("perfil")) {
        rows = analytics.perfilTurista.origensCidades.map((c) => ({
          ...baseMeta,
          Cidade_UF: c.cidadeUf,
          Respostas: c.respostas,
          Participacao_Total: c.percentual,
          Diaria_Media: c.diariaMedia,
        }));
      } else if (lower.includes("atra")) {
        rows = analytics.atracoes.pontosQuadrante.map((a) => ({
          ...baseMeta,
          Atracao: a.nome,
          Visitas_Declaradas: a.visitas,
          Nota_Media_0_a_5: a.nota,
        }));
      } else {
        rows = analytics.panorama.sazonalidade.map((m) => ({
          ...baseMeta,
          Mes: m.mes,
          Indice_Sazonalidade: m.valor,
          Pesquisas_Coletadas_Total: analytics.panorama.pesquisasColetadas,
          Permanencia_Media_Noites: analytics.panorama.permanenciaMedia,
          NPS_Destino: analytics.panorama.nps,
          Intencao_Retorno_Pct: analytics.panorama.intencaoRetorno,
        }));
      }

      const safeSlug = abaTitulo
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "_")
        .replaceAll(/^_|_$/g, "");

      exportToExcel(abaTitulo, rows, `OTO_Relatorio_${safeSlug}.xlsx`);
    },
    [analytics, exportToExcel, filters, showToast]
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
