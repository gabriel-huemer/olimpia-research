"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Lê uma rota e relê a cada 15 s. `recarregar` lê na hora. */
export function useDados<T>(url: string, periodico = true) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [vez, setVez] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    api<T>(url, { signal: c.signal })
      .then((d) => {
        setDados(d);
        setErro(null);
      })
      .catch((e: Error) => {
        if (!c.signal.aborted) setErro(e.message);
      });
    return () => c.abort();
  }, [url, vez]);

  useEffect(() => {
    if (!periodico) return;
    const t = setInterval(() => setVez((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [periodico]);

  const recarregar = useCallback(() => setVez((n) => n + 1), []);
  return { dados, erro, setErro, recarregar };
}
