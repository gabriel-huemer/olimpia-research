"use client";

import React, { useState } from "react";
import { ClipboardList } from "lucide-react";
import { InsercaoManual } from "@/components/InsercaoManual";
import { BOTAO_CLARO, BOTAO_VERDE, Busca, CAIXA, Codigo, type Cor, Pagina, Seletor, Selo, Tabela } from "@/components/pagina";
import { SeletorPeriodo } from "@/components/SeletorPeriodo";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { OpcoesPesquisas, PesquisaLinha } from "@/lib/pesquisas/consulta";

interface Resposta {
  total: number;
  pagina: number;
  paginas: number;
  pesquisas: PesquisaLinha[];
  opcoes: OpcoesPesquisas;
}

const SITUACAO: Record<PesquisaLinha["situacao"], { rotulo: string; cor: Cor }> = {
  SEM_PENDENCIA: { rotulo: "Sincronizada", cor: "verde" },
  EM_REVISAO: { rotulo: "Sinalizada", cor: "amarelo" },
  CONCLUIDA: { rotulo: "Revisada", cor: "azul" },
};
const ORIGEM: Record<PesquisaLinha["origem"], string> = { CAMPO: "Campo", MANUAL: "Manual", IMPORTACAO: "Importada" };
const opcoes = (todas: string, lista: Array<{ id: string; nome: string }> = []) => [
  { valor: "", rotulo: todas },
  ...lista.map((o) => ({ valor: o.id, rotulo: o.nome })),
];

export default function PesquisasPage() {
  const { canEdit, exportToExcel, showToast } = useApp();
  const [filtros, setFiltros] = useState({ periodo: "Tudo", operador: "", local: "", situacao: "", origem: "", busca: "" });
  const [pagina, setPagina] = useState(1);
  const [inserindo, setInserindo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const consulta = new URLSearchParams(filtros).toString();
  const { dados, erro, setErro, recarregar } = useDados<Resposta>(`/api/pesquisas?${consulta}&pagina=${pagina}`);

  const mudar = (campo: keyof typeof filtros) => (v: string) => {
    setFiltros((f) => ({ ...f, [campo]: v }));
    setPagina(1);
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      const { linhas } = await api<{ linhas: Array<Record<string, unknown>> }>(`/api/pesquisas/exportar?${consulta}`);
      exportToExcel("Pesquisas", linhas, "OTO_Pesquisas.xlsx");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Pagina
      titulo="Pesquisas"
      subtitulo="Respostas coletadas em campo, inseridas manualmente e importadas."
      icone={<ClipboardList className="w-5 h-5" />}
      erro={erro}
      acoes={
        <>
          <button type="button" disabled={ocupado || !dados?.total} onClick={() => void exportar()} className={BOTAO_CLARO}>
            Exportar Excel (até 5.000)
          </button>
          {canEdit && (
            <button type="button" onClick={() => setInserindo(true)} className={BOTAO_VERDE}>Inserir resposta manual</button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SeletorPeriodo valor={filtros.periodo} opcoes={dados?.opcoes.periodos ?? []} aoMudar={mudar("periodo")} />
        <Seletor rotulo="Operador" valor={filtros.operador} aoMudar={mudar("operador")} opcoes={opcoes("Todos", dados?.opcoes.operadores)} />
        <Seletor rotulo="Local" valor={filtros.local} aoMudar={mudar("local")} opcoes={opcoes("Todos", dados?.opcoes.locais)} />
        <Seletor
          rotulo="Situação"
          valor={filtros.situacao}
          aoMudar={mudar("situacao")}
          opcoes={opcoes("Todas", Object.entries(SITUACAO).map(([id, s]) => ({ id, nome: s.rotulo })))}
        />
        <Seletor
          rotulo="Origem"
          valor={filtros.origem}
          aoMudar={mudar("origem")}
          opcoes={opcoes("Todas", Object.entries(ORIGEM).map(([id, nome]) => ({ id, nome })))}
        />
        <Busca valor={filtros.busca} aoMudar={mudar("busca")} texto="Buscar protocolo" />
      </div>

      <div className={CAIXA}>
        {dados?.pesquisas.length ? (
          <Tabela colunas={["Protocolo", "Cidade de origem", "Operador", "Local", "Coletada em", "Origem", "Situação"]}>
            {dados.pesquisas.map((p) => (
              <tr key={p.id}>
                <td className="py-3 pr-4"><Codigo>{p.protocolo}</Codigo></td>
                <td className="py-3 pr-4">{p.cidade ?? "—"}</td>
                <td className="py-3 pr-4">{p.operador}</td>
                <td className="py-3 pr-4">{p.local ?? "—"}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{p.coletada}</td>
                <td className="py-3 pr-4">{ORIGEM[p.origem]}{p.canal && ` · ${p.canal}`}</td>
                <td className="py-3"><Selo cor={SITUACAO[p.situacao].cor}>{SITUACAO[p.situacao].rotulo}</Selo></td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <p className="text-xs text-slate-500">{dados ? "Nenhuma pesquisa com esses filtros." : "Carregando..."}</p>
        )}
        {!!dados?.total && (
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span>{dados.total.toLocaleString("pt-BR")} pesquisas · página {dados.pagina} de {dados.paginas}</span>
            <span className="flex gap-2">
              <button type="button" disabled={dados.pagina <= 1} onClick={() => setPagina(dados.pagina - 1)} className={BOTAO_CLARO}>Anterior</button>
              <button type="button" disabled={dados.pagina >= dados.paginas} onClick={() => setPagina(dados.pagina + 1)} className={BOTAO_CLARO}>Próxima</button>
            </span>
          </div>
        )}
      </div>

      {inserindo && (
        <InsercaoManual
          locais={dados?.opcoes.locais ?? []}
          aoFechar={() => setInserindo(false)}
          aoSalvar={(protocolo, alertas) => {
            setInserindo(false);
            recarregar();
            showToast(`Protocolo ${protocolo} registrado${alertas ? ", com alerta para revisão" : ""}.`);
          }}
        />
      )}
    </Pagina>
  );
}
