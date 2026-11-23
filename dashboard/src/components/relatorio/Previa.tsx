"use client";

import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

/** Mostra as páginas do próprio arquivo que será baixado. */
export default function Previa({ arquivo }: { arquivo: Blob }) {
  const alvo = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let fechar = () => {};
    const desenhar = async () => {
      const tarefa = getDocument({ data: await arquivo.arrayBuffer() });
      fechar = () => void tarefa.destroy();
      if (cancelado) return fechar();
      const doc = await tarefa.promise;
      for (let n = 1; n <= doc.numPages; n++) {
        const pagina = await doc.getPage(n);
        const base = pagina.getViewport({ scale: 1 });
        const largura = Math.min(1600, (alvo.current?.clientWidth ?? 800) * Math.min(2, window.devicePixelRatio || 1));
        const viewport = pagina.getViewport({ scale: Math.max(1, largura / base.width) });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "w-full h-auto bg-white shadow border border-slate-200";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `Página ${n} de ${doc.numPages}`);
        await pagina.render({ canvas, viewport }).promise;
        if (cancelado) return;
        if (n === 1) alvo.current?.replaceChildren(canvas);
        else alvo.current?.append(canvas);
      }
    };
    desenhar().catch(() => !cancelado && setErro(true));
    return () => {
      cancelado = true;
      fechar();
    };
  }, [arquivo]);

  return (
    <>
      {erro && <p className="text-xs text-rose-800">Não foi possível mostrar a prévia neste navegador. O arquivo pode ser baixado normalmente.</p>}
      <div ref={alvo} data-previa className="space-y-4" />
    </>
  );
}
