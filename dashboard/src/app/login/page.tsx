"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn, ArrowLeft } from "lucide-react";
import { destinoSeguro } from "@/lib/auth/origem";

function FormularioLogin() {
  const params = useSearchParams();
  const destino = destinoSeguro(params.get("proximo"));
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (r.ok) {
        // Recarrega a página inteira para o painel ler a sessão nova.
        window.location.href = destino;
        return;
      }
      const d = await r.json().catch(() => null);
      setErro(d?.erro ?? "Não foi possível entrar.");
    } catch {
      setErro("Sem conexão com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-[#008767] focus:ring-2 focus:ring-[#008767]/20"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="senha" className="block text-xs font-semibold text-slate-700">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-[#008767] focus:ring-2 focus:ring-[#008767]/20"
        />
      </div>
      {erro && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full inline-flex items-center justify-center gap-2 bg-[#008767] hover:bg-[#006e54] disabled:opacity-60 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition"
      >
        <LogIn className="w-4 h-4" />
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-6">
          <div className="space-y-2">
            <div className="text-[22px] font-extrabold tracking-tight leading-none">
              <span className="text-[#182657]">OT</span>
              <span className="text-[#008767]">O</span>
            </div>
            <h1 className="text-base font-bold text-slate-900">Entrar no painel</h1>
            <p className="text-xs text-slate-500">
              Acesso da equipe do Observatório de Turismo de Olímpia. As Análises são públicas e não
              precisam de login.
            </p>
          </div>
          <Suspense fallback={null}>
            <FormularioLogin />
          </Suspense>
        </div>
        <Link
          href="/analises/panorama"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para as Análises
        </Link>
      </div>
    </main>
  );
}
