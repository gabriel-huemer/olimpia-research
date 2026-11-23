import { NextRequest, NextResponse } from "next/server";
import { anosComColeta } from "@/lib/anos";
import { hojeLocal, opcoesPeriodo, resolverPeriodo } from "@/lib/periodo";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { criarOperador, listarLocais, listarOperadores } from "@/lib/operadores/operadores";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    const hoje = hojeLocal();
    const intervalo = resolverPeriodo(req.nextUrl.searchParams.get("periodo") ?? "Últimos 30 dias", hoje);
    const [operadores, locais, anos] = await Promise.all([
      listarOperadores(intervalo, g.usuario.areas.sistema), listarLocais(), anosComColeta(),
    ]);
    const periodos = opcoesPeriodo(["Últimos 7 dias", "Mês atual", "Últimos 30 dias"], anos, hoje);
    return NextResponse.json({ operadores, locais, periodos }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}

// Cadastrar e editar operador é do administrador (RF20).
export async function POST(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json(await criarOperador(g.usuario.id, corpo ?? {}), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
