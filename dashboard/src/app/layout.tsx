import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "OTO — Observatório de Turismo de Olímpia | Painel Web",
  description:
    "Sistema de Gestão e Análise de Dados Turísticos do Observatório de Turismo de Olímpia (OTO)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
