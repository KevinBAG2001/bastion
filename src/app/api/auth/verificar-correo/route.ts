/**
 * Verificación de correo electrónico (B4).
 *
 * Lección: los enlaces por correo suelen ser GET con ?token= en la URL. Eso filtra el
 * token al encabezado Referer si la página carga recursos externos. Mitigaciones:
 * - Flujo preferido: página /verificar-correo que confirma con POST (token fuera de la URL).
 * - GET legacy (enlaces antiguos): Referrer-Policy: no-referrer y redirección sin token.
 */

import { NextResponse } from "next/server";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { verificarCorreoConToken } from "@/lib/verificar-correo-usuario";

function urlTrasVerificacion(): string {
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/iniciar-sesion?verificado=true`;
}

function respuestaConReferrerEstricto(respuesta: NextResponse): NextResponse {
  respuesta.headers.set("Referrer-Policy", "no-referrer");
  return respuesta;
}

export async function POST(request: Request) {
  if (!verificarOrigenCSRF(request)) {
    return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const token =
    typeof body === "object" && body !== null && "token" in body
      ? String((body as { token: unknown }).token)
      : "";

  if (!token) {
    return NextResponse.json({ error: "Token requerido." }, { status: 400 });
  }

  const resultado = await verificarCorreoConToken(token);
  if (resultado === "invalido") {
    return NextResponse.json(
      { error: "El enlace de verificación es inválido o ha expirado." },
      { status: 400 },
    );
  }

  return respuestaConReferrerEstricto(
    NextResponse.json({ redirect: urlTrasVerificacion() }),
  );
}

/** Compatibilidad con enlaces antiguos que apuntaban directamente a esta API. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return respuestaConReferrerEstricto(
      NextResponse.json({ error: "Token requerido." }, { status: 400 }),
    );
  }

  const resultado = await verificarCorreoConToken(token);
  if (resultado === "invalido") {
    return respuestaConReferrerEstricto(
      NextResponse.json(
        { error: "El enlace de verificación es inválido o ha expirado." },
        { status: 400 },
      ),
    );
  }

  return respuestaConReferrerEstricto(NextResponse.redirect(urlTrasVerificacion()));
}
