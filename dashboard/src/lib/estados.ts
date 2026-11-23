export interface OrigemEstado {
  uf: string;
  percentual: number;
  detalhe?: string;
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/** Os 3 maiores estados isolados; o restante agrupado em uma linha que sempre representa a soma dela. */
export function agruparEstados(estados: Array<{ uf: string; n: number }>): OrigemEstado[] {
  const total = estados.reduce((s, e) => s + e.n, 0);
  const lista = [...estados].sort((a, b) => b.n - a.n);
  const origens: OrigemEstado[] = lista.slice(0, 3).map((e) => ({ uf: e.uf, percentual: pct(e.n, total) }));
  const resto = lista.slice(3);
  if (!resto.length) return origens;
  const percentual = pct(resto.reduce((s, e) => s + e.n, 0), total);
  origens.push(
    resto.length > 3
      ? { uf: `Outros (${resto.length})`, percentual }
      : {
          uf: resto.map((e) => e.uf).join(" · "),
          detalhe: resto.map((e) => `${pct(e.n, total)}%`).join(" · "),
          percentual,
        }
  );
  return origens;
}
