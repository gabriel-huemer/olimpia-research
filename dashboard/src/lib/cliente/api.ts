// Chamada às rotas da API a partir do navegador: devolve o JSON ou lança Error com a mensagem do servidor.
export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const r = await fetch(url, {
    cache: "no-store",
    method: init.method ?? "GET",
    signal: init.signal,
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi(r.status, corpo?.erro ?? "Não foi possível falar com o servidor.");
  return corpo as T;
}
