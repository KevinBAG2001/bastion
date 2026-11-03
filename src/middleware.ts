/**
 * Middleware de Next.js: protección de rutas y encabezados de seguridad.
 *
 * Importa auth.config.ts (Edge-compatible, sin Prisma ni node:crypto)
 * en lugar de auth.ts para evitar avisos de Edge Runtime.
 *
 * Lección C1: el Edge no puede leer sessionVersion en PostgreSQL; si hay cookie JWT,
 * delegamos en /api/auth/comprobar-sesion (Node) y borramos la cookie si fue revocada.
 */

import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const protectedPrefixes = ["/panel", "/cursos", "/perfil"];
const protectedApiPaths = ["/api/auth/2fa/", "/api/auth/cerrar-todas-sesiones"];

const nombreCookieSesion =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

function esRutaProtegida(pathname: string): boolean {
  if (protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname === "/api/auth/cerrar-todas-sesiones") {
    return true;
  }
  return protectedApiPaths.some((p) => pathname.startsWith(p));
}

async function sesionSigueValida(req: Request, origin: string): Promise<boolean> {
  if (pathnameEsComprobacion(new URL(req.url).pathname)) {
    return true;
  }

  const checkUrl = new URL("/api/auth/comprobar-sesion", origin);
  try {
    const respuesta = await fetch(checkUrl, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

function pathnameEsComprobacion(pathname: string): boolean {
  return pathname === "/api/auth/comprobar-sesion";
}

function borrarCookieSesion(respuesta: NextResponse): void {
  respuesta.cookies.set(nombreCookieSesion, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const isProtected = esRutaProtegida(pathname);

  if (isProtected && !req.auth) {
    const login = new URL("/iniciar-sesion", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (isProtected && req.auth) {
    const valida = await sesionSigueValida(req, req.nextUrl.origin);
    if (!valida) {
      if (pathname.startsWith("/api/")) {
        const respuesta = NextResponse.json(
          { error: "Sesión revocada o expirada." },
          { status: 401 },
        );
        borrarCookieSesion(respuesta);
        return respuesta;
      }
      const login = new URL("/iniciar-sesion", req.nextUrl.origin);
      login.searchParams.set("sesion", "revocada");
      const respuesta = NextResponse.redirect(login);
      borrarCookieSesion(respuesta);
      return respuesta;
    }
  }

  if (
    req.auth &&
    (pathname === "/iniciar-sesion" || pathname === "/registro")
  ) {
    const valida = await sesionSigueValida(req, req.nextUrl.origin);
    if (valida) {
      return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
    }
    const respuesta = NextResponse.next();
    borrarCookieSesion(respuesta);
    return respuesta;
  }

  // --- Encabezados de seguridad ---
  const response = NextResponse.next();
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.pwnedpasswords.com`,
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
    "/api/auth/2fa/:path*",
    "/api/auth/cerrar-todas-sesiones",
    "/api/auth/comprobar-sesion",
    "/api/:path*",
  ],
};
