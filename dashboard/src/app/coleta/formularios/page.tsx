"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { BOTAO_VERDE, CAIXA, type Cor, Pagina, Selo, Tabela } from "@/components/pagina";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { VersaoResumo } from "@/lib/formularios/formularios";

const STATUS: Record<VersaoResumo["status"], { rotulo: string; cor: Cor }> = {
  ATIVA: { rotulo: "Ativa", cor: "verde" },
  ENCERRADA: { rotulo: "Encerrada", cor: "cinza" },
  RASCUNHO: { rotulo: "Rascunho", cor: "amarelo" },
};

export default function FormulariosPage() {
  const router = useRouter();
  const { dados, erro, setErro } = useDados<{ versoes: VersaoResumo[] }>("/api/formularios", false);
  const [ocupado, setOcupado] = useState(false);
  const temRascunho = dados?.versoes.some((v) => v.status === "RASCUNHO");

  const criar = async () => {
    setOcupado(true);
    try {
      const { versoes } = await api<{ versoes: VersaoResumo[] }>("/api/formularios", { method: "POST", body: { acao: "criarRascunho" } });
      router.push(`/coleta/formularios/editor?versao=${versoes[0].id}`);
    } catch (e) {
      setErro((e as Error).message);
      setOcupado(false);
    }
  };

  return (
    <Pagina
      titulo="Formulários"
      subtitulo="Pesquisa de Demanda Turística: versões aplicadas em campo."
      icone={<FileText className="w-5 h-5" />}
      erro={erro}
      acoes={
        <button type="button" disabled={ocupado || !dados || temRascunho} onClick={() => void criar()} className={BOTAO_VERDE}>
          Nova versão (cópia da ativa)
        </button>
      }
    >
      <div className={CAIXA}>
        <Tabela colunas={["Versão", "Situação", "Vigente desde", "Perguntas", "Respostas", ""]}>
          {dados?.versoes.map((v) => (
            <tr key={v.id}>
              <td className="py-3 pr-4 font-medium">v{v.numero}</td>
              <td className="py-3 pr-4"><Selo cor={STATUS[v.status].cor}>{STATUS[v.status].rotulo}</Selo></td>
              <td className="py-3 pr-4">{v.vigenteDe ?? "—"}</td>
              <td className="py-3 pr-4">{v.perguntas}</td>
              <td className="py-3 pr-4">{v.respostas.toLocaleString("pt-BR")}</td>
              <td className="py-3">
                <Link href={`/coleta/formularios/editor?versao=${v.id}`} className="font-semibold text-[#008767] hover:underline">
                  {v.status === "RASCUNHO" ? "Editar" : "Ver"}
                </Link>
              </td>
            </tr>
          ))}
        </Tabela>
        <p className="text-xs text-slate-500 mt-4">
          O app baixa a versão ativa quando está com internet e sem pesquisas abertas ou na fila. Versões publicadas não mudam.
        </p>
      </div>
    </Pagina>
  );
}
