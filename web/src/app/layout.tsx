import type { Metadata } from "next";
import "./globals.css";
import { Raleway } from "next/font/google";
import { cn } from "@/lib/utils";

const raleway = Raleway({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Kanban Colaborativo",
  description: "Quadros Kanban em tempo real, inspirado no Trello.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans dark", raleway.variable)}>
      <head>
        <link rel="icon" href="/cmb-icon.svg" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
