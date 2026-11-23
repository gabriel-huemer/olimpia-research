// Desenho em PDF das três versões. Carregado só quando alguém exporta (import dinâmico).
import React from "react";
import { Circle, Document, Font, G, Line, Page, pdf, Polyline, Rect, Svg, Text, View } from "@react-pdf/renderer";
import type { Bloco, Modelo, PaginaModelo, Ponto } from "@/lib/relatorio/modelo";

// Sem separar sílabas: rótulos curtos ficam melhor com reticências.
Font.registerHyphenationCallback((palavra) => [palavra]);

const AZUL = "#182657";
const VERDE = "#008767";
const LARANJA = "#e07a1f";
const VERMELHO = "#b83b3b";
const AMBAR = "#c98a00";
const CINZA = "#5a6675";
const LINHA = "#dfe5ea";
const FUNDO = "#eef2f5";
const PARTES = [VERDE, AMBAR, VERMELHO];
const NEGRITO = "Helvetica-Bold";
const INSTITUICAO = "Observatório de Turismo de Olímpia";

/** Medidas de cada formato, em pontos. */
const MEDIDAS = {
  A4: { largura: 595, altura: 842, margem: 34, fonte: 9.5, titulo: 20, secao: 11.5, kpi: 24, barra: 10, linha: 17, espaco: 16, vao: 20 },
  SLIDE: { largura: 960, altura: 540, margem: 48, fonte: 15.5, titulo: 32, secao: 18, kpi: 46, barra: 17, linha: 28, espaco: 20, vao: 36 },
};
type M = (typeof MEDIDAS)["A4"];

function Secao({ titulo, nota, m }: { titulo: string; nota?: string; m: M }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: VERDE, paddingBottom: 2, marginBottom: m.espaco / 3 }}>
      <Text style={{ fontFamily: NEGRITO, fontSize: m.secao, color: AZUL }}>{titulo}</Text>
      {nota ? <Text style={{ fontSize: m.fonte * 0.8, color: CINZA, flexShrink: 1, paddingLeft: 6 }}>{nota}</Text> : null}
    </View>
  );
}

const SemDados = ({ m }: { m: M }) => <Text style={{ fontSize: m.fonte, color: CINZA }}>Sem respostas neste recorte.</Text>;

function Barras({ b, m }: { b: Extract<Bloco, { tipo: "barras" }>; m: M }) {
  const cor = b.cor === "vermelho" ? VERMELHO : VERDE;
  return (
    <>
      {b.itens.map((i, k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", height: m.linha }}>
          <Text style={{ width: "50%", fontSize: m.fonte, maxLines: 1, textOverflow: "ellipsis", paddingRight: 4 }}>{i.rotulo}</Text>
          <View style={{ flex: 1, height: m.barra, backgroundColor: FUNDO, borderRadius: 2 }}>
            <View style={{ width: `${Math.min(100, Math.max(0, i.largura))}%`, height: m.barra, backgroundColor: cor, borderRadius: 2 }} />
          </View>
          <Text style={{ width: m.fonte * 5.6, paddingLeft: 4, fontSize: m.fonte, fontFamily: NEGRITO, textAlign: "right" }}>{i.texto}</Text>
        </View>
      ))}
    </>
  );
}

function Empilhada({ b, m }: { b: Extract<Bloco, { tipo: "empilhada" }>; m: M }) {
  const cores = b.legenda.length === 2 ? [AZUL, VERDE] : PARTES;
  const rotulo = b.linhas.some((l) => l.rotulo);
  return (
    <>
      {b.linhas.map((l, k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", height: rotulo ? m.linha * 1.1 : m.linha * 1.4 }}>
          {rotulo ? <Text style={{ width: "32%", fontSize: m.fonte, maxLines: 1, textOverflow: "ellipsis" }}>{l.rotulo}</Text> : null}
          <View style={{ flex: 1, flexDirection: "row", height: rotulo ? m.barra * 1.25 : m.barra * 1.5 }}>
            {l.partes.map((v, i) => (v > 0 ? <View key={i} style={{ width: `${v}%`, backgroundColor: cores[i] }} /> : null))}
          </View>
          {rotulo
            ? l.partes.map((v, i) => (
                <Text key={i} style={{ width: m.fonte * 3, fontSize: m.fonte, fontFamily: NEGRITO, textAlign: "right", color: cores[i] }}>{v}%</Text>
              ))
            : null}
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: m.espaco, marginTop: 2 }}>
        {b.legenda.map((nome, i) => (
          <Text key={nome} style={{ fontSize: m.fonte * 0.9, color: cores[i], fontFamily: NEGRITO }}>
            {rotulo ? nome : `${b.linhas[0].partes[i]}% ${nome}`}
          </Text>
        ))}
      </View>
    </>
  );
}

/** Rótulos do eixo: com muitos pontos, mostra um a cada n para não encavalar. */
const passo = (n: number, largura: number, fonte: number) => Math.max(1, Math.ceil((n * fonte * 4.2) / largura));

function Grafico({ b, m, largura }: { b: Extract<Bloco, { tipo: "colunas" | "linha" }>; m: M; largura: number }) {
  const h = b.altura ?? 130;
  const f = m.fonte * 0.8;
  const topo = f * 2;
  const base = h - f * (b.tipo === "linha" ? 2.6 : 1.8);
  const n = b.pontos.length;
  const valores = b.pontos.flatMap((p) => (p.valor === null ? [] : [p.valor]));
  if (!valores.length) return <SemDados m={m} />;
  const colunas = b.tipo === "colunas";
  const max = Math.max(...valores);
  const min = colunas ? 0 : Math.min(...valores);
  const folga = colunas ? 0 : Math.max((max - min) * 0.15, Math.abs(max) * 0.02, 0.1);
  const piso = min - folga;
  const faixa = Math.max(max + folga - piso, 0.0001);
  const y = (v: number) => base - ((v - piso) / faixa) * (base - topo);
  // Nas linhas, folga lateral para os rótulos das pontas caberem inteiros.
  const lado = colunas ? 0 : f * 1.8;
  const x = (i: number) => lado + ((largura - lado * 2) / n) * (i + 0.5);
  const dentro = (i: number, texto: string) => Math.min(largura - texto.length * f * 0.29, Math.max(texto.length * f * 0.29, x(i)));
  const salto = passo(n, largura, f);
  // Conta a partir do fim: o ponto mais recente sempre tem rótulo.
  const eixo = (i: number) => (n - 1 - i) % salto === 0;
  // Linha: primeiro, último, maior e menor (uma vez cada).
  const marcados = new Set([0, n - 1, b.pontos.findIndex((p) => p.valor === max), b.pontos.findIndex((p) => p.valor === min)]);
  const mostra = (i: number) => (colunas ? eixo(i) : marcados.has(i));
  const trechos = segmentos(b.pontos).map((s) => s.map((i) => `${x(i)},${y(b.pontos[i].valor as number)}`).join(" "));
  return (
    <Svg width={largura} height={h} viewBox={`0 0 ${largura} ${h}`}>
      {[0, 0.5, 1].map((k) => (
        <Line key={k} x1={0} x2={largura} y1={base - (base - topo) * k} y2={base - (base - topo) * k} stroke={LINHA} strokeWidth={0.7} />
      ))}
      {colunas
        ? b.pontos.map((p, i) => {
            const l = Math.min((largura / n) * 0.64, 46);
            return p.valor ? <Rect key={i} x={x(i) - l / 2} y={y(p.valor)} width={l} height={base - y(p.valor)} fill={VERDE} /> : null;
          })
        : trechos.map((pts, k) => <Polyline key={k} points={pts} fill="none" stroke={VERDE} strokeWidth={m.fonte / 6} />)}
      {b.pontos.map((p, i) => (
        <G key={i}>
          {!colunas && p.valor !== null ? <Circle cx={x(i)} cy={y(p.valor)} r={m.fonte / 4.5} fill={i === n - 1 ? LARANJA : VERDE} /> : null}
          {p.valor !== null && mostra(i) ? (
            <Text x={dentro(i, p.texto)} y={!colunas && p.valor === min && p.valor !== max ? y(p.valor) + f * 1.4 : y(p.valor) - f * 0.6} textAnchor="middle" style={{ fontSize: f, fontFamily: NEGRITO }} fill={AZUL}>{p.texto}</Text>
          ) : null}
          {eixo(i) ? (
            <Text x={dentro(i, p.rotulo)} y={h - f * 0.4} textAnchor="middle" style={{ fontSize: f }} fill={CINZA}>{p.rotulo}</Text>
          ) : null}
        </G>
      ))}
    </Svg>
  );
}

/** Trechos contínuos: um ponto sem resposta interrompe a linha. */
function segmentos(pontos: Ponto[]): number[][] {
  const r: number[][] = [];
  pontos.forEach((p, i) => {
    if (p.valor === null) return;
    if (i > 0 && pontos[i - 1].valor !== null) r[r.length - 1].push(i);
    else r.push([i]);
  });
  return r.filter((s) => s.length > 1);
}

function Dispersao({ b, m, largura }: { b: Extract<Bloco, { tipo: "dispersao" }>; m: M; largura: number }) {
  const h = b.altura ?? 230;
  const f = m.fonte * 0.85;
  const esq = f * 2;
  const base = h - f * 2;
  const xs = b.pontos.map((p) => p.x);
  const minX = Math.max(0, Math.floor((Math.min(...xs) - 5) / 5) * 5);
  const maxX = Math.max(minX + 10, Math.min(100, Math.ceil((Math.max(...xs) + 5) / 5) * 5));
  const minY = Math.max(1, Math.floor((Math.min(...b.pontos.map((p) => p.y)) - 0.1) * 2) / 2);
  const x = (v: number) => esq + f + ((v - minX) / (maxX - minX)) * (largura - esq - f * 3);
  const y = (v: number) => base - ((v - minY) / (5 - minY || 1)) * (base - f * 1.5);
  const marcasY = [minY, (minY + 5) / 2, 5];
  const r = f * 0.95;
  return (
    <Svg width={largura} height={h} viewBox={`0 0 ${largura} ${h}`}>
      {marcasY.map((v) => (
        <G key={v}>
          <Line x1={esq} x2={largura} y1={y(v)} y2={y(v)} stroke={LINHA} strokeWidth={0.7} />
          <Text x={esq - 4} y={y(v) + f / 3} textAnchor="end" style={{ fontSize: f }} fill={CINZA}>{v.toFixed(1).replace(".", ",")}</Text>
        </G>
      ))}
      {[0, 0.5, 1].map((k) => (
        <Text key={k} x={x(minX + (maxX - minX) * k)} y={h - f * 0.4} textAnchor="middle" style={{ fontSize: f }} fill={CINZA}>{`${Math.round(minX + (maxX - minX) * k)}%`}</Text>
      ))}
      {b.pontos.map((p) => (
        <G key={p.n}>
          <Circle cx={x(p.x)} cy={y(p.y)} r={r} fill={VERDE} fillOpacity={0.85} stroke="#ffffff" strokeWidth={0.8} />
          <Text x={x(p.x)} y={y(p.y) + f * 0.3} textAnchor="middle" style={{ fontSize: f * 0.85, fontFamily: NEGRITO }} fill="#ffffff">{String(p.n)}</Text>
        </G>
      ))}
    </Svg>
  );
}

function Tabela({ b, m }: { b: Extract<Bloco, { tipo: "tabela" }>; m: M }) {
  const larg = (i: number) => (b.colunas.length <= 3 ? (i === 0 ? { flex: 1 } : { width: m.fonte * 6.5 }) : { flex: 1 });
  const linha = (cel: string[], estilo: "cab" | "normal" | "total", k: number | string) => (
    <View key={k} style={{ flexDirection: "row", alignItems: "center", height: m.linha, backgroundColor: estilo === "cab" ? AZUL : undefined, borderBottomWidth: 0.5, borderBottomColor: LINHA, paddingHorizontal: 4 }}>
      {cel.map((c, i) => (
        <Text key={i} style={{ ...larg(i), fontSize: m.fonte * 0.95, textAlign: i ? "right" : "left", color: estilo === "cab" ? "#ffffff" : "#14262b", fontFamily: estilo === "normal" ? "Helvetica" : NEGRITO, maxLines: 1, textOverflow: "ellipsis" }}>{c}</Text>
      ))}
    </View>
  );
  return (
    <>
      {linha(b.colunas, "cab", "c")}
      {b.linhas.map((l, k) => linha(l, "normal", k))}
      {b.total ? linha(b.total, "total", "t") : null}
    </>
  );
}

function vazio(b: Bloco): boolean {
  if (b.tipo === "barras") return !b.itens.length;
  if (b.tipo === "empilhada" || b.tipo === "tabela") return !b.linhas.length;
  if (b.tipo === "colunas" || b.tipo === "linha" || b.tipo === "dispersao") return !b.pontos.length;
  return false;
}

function BlocoPdf({ b, m, largura }: { b: Bloco; m: M; largura: number }) {
  if (b.tipo === "texto") {
    return <Text style={{ fontSize: m.fonte * 0.95, color: CINZA, lineHeight: 1.45, backgroundColor: FUNDO, padding: m.espaco * 0.7 }}>{b.texto}</Text>;
  }
  if (b.tipo === "kpis") {
    return (
      <View style={{ flexDirection: "row", gap: m.espaco * 0.7 }}>
        {b.itens.map((k) => (
          <View key={k.rotulo} style={{ flex: 1, borderWidth: 1, borderColor: LINHA, borderRadius: 4, padding: m.espaco * 0.7 }}>
            <Text style={{ fontSize: m.kpi, fontFamily: NEGRITO, color: VERDE }}>{k.valor}</Text>
            <Text style={{ fontSize: m.fonte, color: CINZA, marginTop: 2 }}>{k.rotulo}</Text>
            {k.detalhe ? <Text style={{ fontSize: m.fonte * 0.85, color: AZUL, marginTop: 2 }}>{k.detalhe}</Text> : null}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      <Secao titulo={b.titulo} nota={b.nota} m={m} />
      {vazio(b) ? <SemDados m={m} /> : null}
      {!vazio(b) && b.tipo === "barras" ? <Barras b={b} m={m} /> : null}
      {!vazio(b) && b.tipo === "empilhada" ? <Empilhada b={b} m={m} /> : null}
      {!vazio(b) && (b.tipo === "colunas" || b.tipo === "linha") ? <Grafico b={b} m={m} largura={largura} /> : null}
      {!vazio(b) && b.tipo === "dispersao" ? <Dispersao b={b} m={m} largura={largura} /> : null}
      {!vazio(b) && b.tipo === "tabela" ? <Tabela b={b} m={m} /> : null}
    </View>
  );
}

function Logo({ tamanho }: { tamanho: number }) {
  return (
    <Text style={{ fontSize: tamanho, fontFamily: NEGRITO, color: "#ffffff" }}>
      OT<Text style={{ color: "#3fc79a" }}>O</Text>
    </Text>
  );
}

function Corpo({ p, m }: { p: PaginaModelo; m: M }) {
  return (
    <>
      {p.linhas.map((colunas, k) => {
        const largura = (m.largura - m.margem * 2 - m.vao * (colunas.length - 1)) / colunas.length;
        return (
          <View key={k} style={{ flexDirection: "row", gap: m.vao, marginTop: m.espaco }}>
            {colunas.map((blocos, i) => (
              <View key={i} style={{ width: largura, gap: m.espaco }}>
                {blocos.map((b, j) => <BlocoPdf key={j} b={b} m={m} largura={largura} />)}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

function Rodape({ mod, m, n, total }: { mod: Modelo; m: M; n: number; total: number }) {
  return (
    <View style={{ position: "absolute", left: m.margem, right: m.margem, bottom: m.margem * 0.45, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: LINHA, paddingTop: 4 }}>
      <Text style={{ fontSize: m.fonte * 0.8, color: CINZA }}>{mod.rodape}</Text>
      <Text style={{ fontSize: m.fonte * 0.8, color: CINZA }}>{`${n} / ${total}`}</Text>
    </View>
  );
}

function Capa({ mod, m, total }: { mod: Modelo; m: M; total: number }) {
  const slide = mod.formato === "SLIDE";
  const itens = mod.capa?.itens ?? [];
  return (
    <>
      <View style={{ backgroundColor: AZUL, padding: m.margem * 1.4, paddingTop: slide ? 110 : 60, height: slide ? m.altura : 320 }}>
        <Logo tamanho={m.titulo * 1.6} />
        <Text style={{ fontSize: m.fonte * 1.2, color: "#cfd8ea", marginTop: m.espaco }}>{INSTITUICAO}</Text>
        <Text style={{ fontSize: m.titulo * 1.6, fontFamily: NEGRITO, color: "#ffffff", marginTop: m.espaco, lineHeight: 1.15 }}>{mod.titulo}</Text>
        <Text style={{ fontSize: m.fonte * 1.4, color: "#ffffff", marginTop: m.espaco }}>{mod.periodo}</Text>
        {mod.filtros.length ? <Text style={{ fontSize: m.fonte * 1.1, color: "#cfd8ea", marginTop: 8, lineHeight: 1.3 }}>{`Filtros — ${mod.filtros.join(" · ")}`}</Text> : null}
        {slide ? <Text style={{ position: "absolute", left: m.margem * 1.4, bottom: m.margem, fontSize: m.fonte * 0.9, color: "#cfd8ea" }}>{mod.rodape}</Text> : null}
      </View>
      {slide ? null : (
        <View style={{ padding: m.margem * 1.4 }}>
          <Text style={{ fontSize: m.secao * 1.2, fontFamily: NEGRITO, color: AZUL, marginBottom: 10 }}>Conteúdo</Text>
          {itens.map((i) => (
            <View key={i.pagina} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: LINHA, paddingVertical: 7 }}>
              <Text style={{ fontSize: m.fonte * 1.2 }}>{i.titulo}</Text>
              <Text style={{ fontSize: m.fonte * 1.2 }}>{String(i.pagina)}</Text>
            </View>
          ))}
        </View>
      )}
      {slide ? null : <Rodape mod={mod} m={m} n={1} total={total} />}
    </>
  );
}

function Cabecalho({ mod, p, m }: { mod: Modelo; p: PaginaModelo; m: M }) {
  const contexto = [mod.periodo, ...mod.filtros].join(" · ");
  if (mod.versao === "resumo") {
    return (
      <View style={{ backgroundColor: AZUL, marginHorizontal: -m.margem, marginTop: -m.margem, padding: m.margem, paddingVertical: 16 }}>
        <Text style={{ fontSize: m.fonte, color: "#cfd8ea" }}>{`${INSTITUICAO} · ${mod.titulo}`}</Text>
        <Text style={{ fontSize: 22, fontFamily: NEGRITO, color: "#ffffff", marginTop: 4 }}>{p.titulo}</Text>
        <Text style={{ fontSize: m.fonte, color: "#ffffff", marginTop: 4 }}>{contexto}</Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={{ fontSize: m.fonte * 0.85, color: CINZA }}>{`${INSTITUICAO} · ${contexto}`}</Text>
      <Text style={{ fontSize: m.titulo, fontFamily: NEGRITO, color: AZUL, marginTop: 4 }}>{p.titulo}</Text>
    </View>
  );
}

function Documento({ mod }: { mod: Modelo }) {
  const m = MEDIDAS[mod.formato];
  const total = mod.paginas.length + (mod.capa ? 1 : 0);
  const pagina = { size: [m.largura, m.altura] as [number, number] };
  // Altura fixa: cada folha ocupa exatamente uma página, com pouco ou muito conteúdo.
  const folha = { width: m.largura, height: m.altura, overflow: "hidden" as const, fontFamily: "Helvetica", fontSize: m.fonte, color: "#14262b" };
  return (
    <Document title={`${INSTITUICAO} — ${mod.titulo}`} author={INSTITUICAO} language="pt-BR">
      {mod.capa ? (
        <Page {...pagina} wrap={false}>
          <View style={folha}><Capa mod={mod} m={m} total={total} /></View>
        </Page>
      ) : null}
      {mod.paginas.map((p, i) => (
        <Page key={i} {...pagina} wrap={false}>
          <View style={{ ...folha, padding: m.margem }}>
            <Cabecalho mod={mod} p={p} m={m} />
            <Corpo p={p} m={m} />
            <Rodape mod={mod} m={m} n={i + 1 + (mod.capa ? 1 : 0)} total={total} />
          </View>
        </Page>
      ))}
    </Document>
  );
}

export const gerarPdf = (mod: Modelo): Promise<Blob> => pdf(<Documento mod={mod} />).toBlob();
