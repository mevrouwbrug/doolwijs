import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doolwijs – Taalverzorging",
  description: "Educatieve 2D-gridgame voor taalverzorging oefenen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="font-opendyslexic antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
