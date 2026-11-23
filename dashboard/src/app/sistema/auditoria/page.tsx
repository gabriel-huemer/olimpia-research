"use client";

import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import { BOTAO_CLARO, Busca, CAIXA, Codigo, type Cor, Pagina, Seletor, Selo, Tabela } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";
import type { RegistroAuditoria } from "@/lib/auditoria/auditoria";
import { ACOES, type Acao } from "@/lib/auditoria/texto";

interface Resposta {
  registros: RegistroAuditoria[];
  proximo: string | null;
  usuarios: Array<{ id: string; nome: string }>;
}

const COR: Record<Acao, Cor> = { Inseriu: "cinza", Alterou: "azul", Aprovou: "verde", Corrigiu: "azul", Excluiu: "vermelho" };
const PERIODOS = [
  { valor: "7", rotulo: "Últimos 7 dias" },
  { valor: "30", rotulo: "Últimos 30 dias" },
  { valor: "365", rotulo: "Último ano" },
  { valor: "", rotulo: "Tudo" },
];
const EXPORTAR = 5000;

export default function AuditoriaPage() {
  const { exportToExcel } = useApp();
  const [usuario, setUsuario] = useState("");
  const [acao, setAcao] = useState("");
  const [dias, setDias] = useState("30");
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const filtros = new URLSearchParams({ usuario, acao, dias, busca }).toString();

  useEffect(() => {
    const c = new AbortController();
    // Espera a pessoa parar de digitar antes de consultar.
    const t = setTimeout(() => {
      api<Resposta>(`/api/auditoria?${filtros}`, { signal: c.signal })
        .then((d) => {
          setDados(d);
          setErro(null);
        })
        .catch((e: Error) => !c.signal.aborted && setErro(e.message));
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [filtros]);

  const executar = async (acaoTela: () => Promise<void>) => {
    setOcupado(true);
    try {
      await acaoTela();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const carregarMais = () =>
    executar(async () => {
      const d = await api<Resposta>(`/api/auditoria?${filtros}&antes=${dados?.proximo}`);
      setDados((a) => ({ ...d, registros: [...(a?.registros ?? []), ...d.registros] }));
    });

  const exportar = () =>
    executar(async () => {
      const d = await api<Resposta>(`/api/auditoria?${filtros}&limite=${EXPORTAR}`);
      exportToExcel(
        "Auditoria",
        d.registros.map((r) => ({
          Data_Hora: r.quando, Usuario: r.usuario, Acao: r.acao, Item: r.item, Protocolo: r.protocolo ?? "", Alteracao: r.alteracao,
        })),
        "OTO_Auditoria.xlsx"
      );
    });

  return (
    <Pagina
      titulo="Auditoria"
      subtitulo="Histórico de alterações, somente leitura. Nada é apagado do registro."
      icone={<History className="w-5 h-5" />}
      erro={erro}
      acoes={
        <button type="button" disabled={ocupado || !dados?.registros.length} onClick={() => void exportar()} className={BOTAO_CLARO}>
          Exportar (até 5.000)
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <Seletor
          rotulo="Usuário"
          valor={usuario}
          aoMudar={setUsuario}
          opcoes={[
            { valor: "", rotulo: "Todos" },
            { valor: "sistema", rotulo: "Sistema" },
            ...(dados?.usuarios ?? []).map((u) => ({ valor: u.id, rotulo: u.nome })),
          ]}
        />
        <Seletor rotulo="Ação" valor={acao} aoMudar={setAcao} opcoes={[{ valor: "", rotulo: "Todas" }, ...ACOES]} />
        <Seletor rotulo="Período" valor={dias} aoMudar={setDias} opcoes={PERIODOS} />
        <Busca valor={busca} aoMudar={setBusca} texto="Buscar protocolo ou nome" />
      </div>

      <div className={CAIXA}>
        {dados === null ? (
          <p className="text-xs text-slate-500">Carregando...</p>
        ) : dados.registros.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum registro com esses filtros.</p>
        ) : (
          <Tabela colunas={["Data/hora", "Usuário", "Ação", "Item", "Alteração"]}>
            {dados.registros.map((r) => (
              <tr key={r.id}>
                <td className="py-3 pr-4 whitespace-nowrap">{r.quando}</td>
                <td className="py-3 pr-4 font-medium">{r.usuario}</td>
                <td className="py-3 pr-4">
                  <Selo cor={COR[r.acao]}>{r.acao}</Selo>
                </td>
                <td className="py-3 pr-4">
                  {r.item} {r.protocolo && <Codigo>{r.protocolo}</Codigo>}
                </td>
                <td className="py-3 break-words max-w-md text-xs">{r.alteracao}</td>
              </tr>
            ))}
          </Tabela>
        )}
        {dados?.proximo && (
          <button type="button" disabled={ocupado} onClick={() => void carregarMais()} className={`${BOTAO_CLARO} mt-4`}>
            Carregar mais
          </button>
        )}
      </div>
    </Pagina>
  );
}
