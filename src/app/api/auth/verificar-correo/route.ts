/**
 * Route Handler para verificación de correo electrónico.
 *
 * ¿Qué ataque evita?
 * - Registro con correos ajenos (CWE-345): solo el dueño del correo puede verificar.
 * - Tokens de un solo uso con hash (CWE-257, CWE-613).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/tokens";
import { registrarEvento } from "@/lib/bitacora-seguridad";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido." }, { status: 400 });
  }

  const userId = await verificarToken(token, "VERIFICACION_CORREO");
  if (!userId) {
    return NextResponse.json(
      { error: "El enlace de verificación es inválido o ha expirado." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await registrarEvento({
    userId,
    accion: "verificacion_correo",
    modulo: "verificacion",
    resultado: "exito",
  });

  // Redirigir a la página de login con mensaje de éxito
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    `${baseUrl}/iniciar-sesion?verificado=true`,
  );
}
