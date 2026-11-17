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
    setUsuarios((data.usuarios as UsuarioSistema[]) || []);
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
    void fetchState();
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
        applyServerState(data);
      }
    },
    [applyServerState, currentUser.nome]
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
