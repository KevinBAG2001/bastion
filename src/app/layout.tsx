import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeaderShell } from "@/components/site-header-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bastion — Aprende ciberseguridad desde cero",
    template: "%s · Bastion",
  },
  description:
    "Plataforma educativa en español para aprender ciberseguridad con lecciones, cuestionarios y progreso gamificado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeaderShell />
          <main className="flex-1">{children}</main>
        </Providers>
        <footer className="border-t border-card-border py-8 text-center text-sm text-muted">
          © Bastion — Formación en ciberseguridad para principiantes
        </footer>
      </body>
    </html>
  );
}
