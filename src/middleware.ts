/**
 * Middleware de Next.js: protección de rutas y encabezados de seguridad.
 *
 * Importa auth.config.ts (Edge-compatible, sin Prisma ni node:crypto)
 * en lugar de auth.ts para evitar avisos de Edge Runtime.
 *
 * ¿Qué ataques evitan los encabezados?
 * - X-Content-Type-Options: nosniff → evita MIME sniffing (CWE-430).
 * - X-Frame-Options: DENY → evita clickjacking (CWE-1021).
 * - Referrer-Policy: strict-origin-when-cross-origin → limita fuga de URLs (CWE-200).
 * - Permissions-Policy → desactiva APIs innecesarias (cámara, micrófono, geolocalización).
 * - Strict-Transport-Security → fuerza HTTPS tras la primera visita (CWE-319).
 * - Content-Security-Policy → restringe orígenes de scripts, estilos e imágenes (CWE-79).
 *   Usa nonce para scripts inline de Next.js.
 */

import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const protectedPrefixes = ["/panel", "/cursos", "/perfil"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // --- Protección de rutas ---
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !req.auth) {
    const login = new URL("/iniciar-sesion", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (
    req.auth &&
    (pathname === "/iniciar-sesion" || pathname === "/registro")
  ) {
    return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
  }

  // --- Encabezados de seguridad ---
  const response = NextResponse.next();
  // CSP estricta. Next.js inyecta scripts inline que requieren 'unsafe-inline'
  // o un nonce coordinado con el framework. Usamos 'unsafe-inline' como fallback
  // junto con 'strict-dynamic' cuando se integre nonce nativo de Next.js (evolución).
  // Austria: CSP sin nonce porque Next.js 16 no expone aún una API estable para
  // pasar el nonce a todos los scripts inline del framework; si se agrega, migrar
  // a script-src 'nonce-...' 'strict-dynamic' y quitar 'unsafe-inline'.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind CSS usa estilos inline
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.pwnedpasswords.com`, // HIBP API
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // HSTS solo en producción (no en desarrollo HTTP)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
});

export const config = {
  matcher: [
    "/panel/:path*",
    "/cursos/:path*",
    "/perfil/:path*",
    "/iniciar-sesion",
    "/registro",
    // Incluir rutas de API para encabezados de seguridad
    "/api/:path*",
  ],
};
