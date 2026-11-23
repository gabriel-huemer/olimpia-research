// Limitador de tentativas de login em memória (por processo), chaveado por "ip|email".

export interface ConfigLimitador {
  maxFalhas: number;
  janelaMs: number;
  bloqueioMs: number;
  maxChaves?: number;
  relogio?: () => number;
}

interface Registro {
  falhas: number[];
  bloqueadoAte: number;
}

export function criarLimitador(cfg: ConfigLimitador) {
  const agora = cfg.relogio ?? (() => Date.now());
  const maxChaves = cfg.maxChaves ?? 10_000;
  const mapa = new Map<string, Registro>();

  function tocar(chave: string, r: Registro) {
    // Reinsere para manter a ordem de uso (Map preserva inserção): a mais antiga sai primeiro.
    mapa.delete(chave);
    mapa.set(chave, r);
    while (mapa.size > maxChaves) {
      const maisAntiga = mapa.keys().next().value as string;
      mapa.delete(maisAntiga);
    }
  }

  return {
    bloqueado(chave: string): boolean {
      const r = mapa.get(chave);
      return !!r && r.bloqueadoAte > agora();
    },
    registrarFalha(chave: string): void {
      const t = agora();
      const r = mapa.get(chave) ?? { falhas: [], bloqueadoAte: 0 };
      r.falhas = r.falhas.filter((f) => t - f < cfg.janelaMs);
      r.falhas.push(t);
      if (r.falhas.length >= cfg.maxFalhas) {
        r.bloqueadoAte = t + cfg.bloqueioMs;
        r.falhas = [];
      }
      tocar(chave, r);
    },
    registrarSucesso(chave: string): void {
      mapa.delete(chave);
    },
    tamanho(): number {
      return mapa.size;
    },
  };
}

export type Limitador = ReturnType<typeof criarLimitador>;
