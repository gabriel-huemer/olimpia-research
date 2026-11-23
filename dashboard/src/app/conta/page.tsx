"use client";

import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import { BOTAO_VERDE, CAIXA, CAMPO, Pagina, ROTULO } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";

export default function ContaPage() {
  const { currentUser, showToast } = useApp();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("nova") !== f.get("repetida")) return setErro("As senhas novas não são iguais.");
    setOcupado(true);
    try {
      await api("/api/auth/senha", { method: "POST", body: { atual: f.get("atual"), nova: f.get("nova") } });
      form.reset();
      setErro(null);
      showToast("Senha alterada.");
    } catch (x) {
      setErro((x as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const campos = [
    ["atual", "Senha atual", "current-password"],
    ["nova", "Nova senha (mínimo de 10, com letras e números)", "new-password"],
    ["repetida", "Repita a nova senha", "new-password"],
  ];
  return (
    <Pagina titulo="Minha conta" subtitulo={currentUser?.email ?? ""} icone={<KeyRound className="w-5 h-5" />} erro={erro}>
      {currentUser && (
        <form onSubmit={(e) => void enviar(e)} className={`${CAIXA} max-w-md space-y-3`}>
          {campos.map(([nome, rotulo, auto]) => (
            <div key={nome}>
              <label htmlFor={nome} className={ROTULO}>{rotulo}</label>
              <input id={nome} name={nome} type="password" autoComplete={auto} required maxLength={72} className={CAMPO} />
            </div>
          ))}
          <button type="submit" disabled={ocupado} className={BOTAO_VERDE}>Trocar senha</button>
        </form>
      )}
    </Pagina>
  );
}
