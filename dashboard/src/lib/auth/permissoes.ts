// Áreas do painel e o que cada perfil enxerga.
// Análises é pública (dados abertos); Coleta e Sistema exigem sessão e permissão.
// Módulo puro (sem banco, sem Next): roda no proxy, nas rotas e nos testes.

export type Area = "analises" | "coleta" | "sistema";
export type AreasPerfil = Partial<Record<Area, boolean>>;

export const AREAS: readonly Area[] = ["analises", "coleta", "sistema"];
export const AREAS_PUBLICAS: readonly Area[] = ["analises"];

export interface PerfilAcesso {
  id?: number;
  nome: string;
  padrao: boolean;
  areas: Record<Area, boolean>;
}

export const PERFIS_PADRAO: readonly PerfilAcesso[] = [
  { nome: "ADMINISTRADOR", padrao: true, areas: { analises: true, coleta: true, sistema: true } },
  { nome: "VISUALIZADOR", padrao: true, areas: { analises: true, coleta: false, sistema: false } },
  // Pesquisador coleta pelo app; não entra no painel web.
  { nome: "PESQUISADOR", padrao: true, areas: { analises: false, coleta: false, sistema: false } },
];

/** Área exigida pela rota, ou null se a rota não pertence a nenhuma área. */
export function areaDaRota(pathname: string): Area | null {
  // Normaliza como o navegador/servidor faria (resolve "..", "." e barras duplicadas).
  let caminho: string;
  try {
    caminho = new URL(pathname, "https://rota.invalid").pathname.toLowerCase();
  } catch {
    return null;
  }
  const primeiro = caminho.split("/").find((s) => s.length > 0);
  return AREAS.includes(primeiro as Area) ? (primeiro as Area) : null;
}

/** Nega por padrão: só libera área conhecida com permissão explicitamente `true`. */
export function podeAcessar(areas: AreasPerfil | null | undefined, area: string): boolean {
  if (!AREAS.includes(area as Area)) return false;
  if (AREAS_PUBLICAS.includes(area as Area)) return true;
  return areas?.[area as Area] === true;
}

/** Perfil com acesso a alguma área restrita do painel web (pode receber sessão). */
export function temAcessoWeb(areas: AreasPerfil | null | undefined): boolean {
  return AREAS.some((a) => areas?.[a] === true);
}

export function perfilEditavel(perfil: { nome: string; padrao: boolean }): boolean {
  return !perfil.padrao;
}
