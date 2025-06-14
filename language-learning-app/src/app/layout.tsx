import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Platform",
  description: "Piattaforma di apprendimento con corsi personalizzati",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased bg-gray-50">
        {/* Nessuna navigazione globale - ogni pagina gestisce la sua UI */}
        {children}
      </body>
    </html>
  );
}