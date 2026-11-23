import type { Metadata } from "next";

// Página sem link público: também fica fora dos buscadores.
export const metadata: Metadata = { title: "OTO", robots: { index: false, follow: false } };

export default function AdministracaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
