/**
 * Validación de sesión JWT frente a sessionVersion en PostgreSQL (CWE-613).
 *
 * Lección: el middleware Edge no puede usar Prisma; la cookie JWT sigue siendo válida
 * criptográficamente aunque hayas cerrado sesión en otro dispositivo. Por eso comparamos
 * sessionVersion en cada auth() (callback jwt) y en este helper para páginas y APIs Node.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { auth } from "@/auth";
export function nombreCookieSesion(): string {
  const cfg = authConfig.cookies?.sessionToken;
  if (cfg && "name" in cfg && typeof cfg.name === "string") {
    return cfg.name;
  }
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

const opcionesCookie = authConfig.cookies?.sessionToken?.options ?? {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/** Elimina la cookie de sesión Auth.js (revocación en el cliente). */
export function borrarCookieSesionEnRespuesta(respuesta: NextResponse): void {
  respuesta.cookies.set(nombreCookieSesion(), "", {
    ...opcionesCookie,
    maxAge: 0,
  });
}

export async function borrarCookieSesionEnServidor(): Promise<void> {
  const jar = await cookies();
  jar.set(nombreCookieSesion(), "", {
    ...opcionesCookie,
    maxAge: 0,
  });
}

/**
 * Comprueba sessionVersion en BD. Devuelve la sesión Auth.js si sigue vigente.
 * Si el JWT quedó invalidado en el callback jwt, session.user.id no estará presente.
 */
export async function obtenerSesionAutenticada() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

/** Respuesta 401 estándar para APIs con cookie de sesión eliminada. */
export function respuestaSesionRevocada(): NextResponse {
  const respuesta = NextResponse.json(
    { error: "Sesión revocada o expirada. Vuelve a iniciar sesión." },
    { status: 401 },
  );
  borrarCookieSesionEnRespuesta(respuesta);
  return respuesta;
}
