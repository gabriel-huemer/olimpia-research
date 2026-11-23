import { NextResponse } from "next/server";
import { ErroAdmin } from "./admin";
import { erro } from "./servidor";

/** Converte erros de validação/regra em 4xx; o resto vira 500 sem vazar detalhes. */
export function respostaDeErro(e: unknown): NextResponse {
  if (e instanceof ErroAdmin) return erro(e.status, e.message);
  console.error("[api]", e);
  return erro(500, "Erro interno.");
}
