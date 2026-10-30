/**
 * Route Handler para restablecer la contraseña con un token válido.
 *
 * ¿Qué ataque evita?
 * - Reutilización de tokens (CWE-613): token de un solo uso.
 * - Contraseñas débiles (CWE-521): validación zod estricta.
 * - Persistencia de sesiones comprometidas (CWE-613): incrementa sessionVersion
 *   para invalidar todas las sesiones JWT existentes.
 * - CSRF (CWE-352): verificación de Origin.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restablecerContrasenaSchema } from "@/lib/validations";
import { verificarToken } from "@/lib/tokens";
import { hashContrasena } from "@/lib/argon2";
import { verificarContrasenFiltrada } from "@/lib/hibp";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { registrarEvento } from "@/lib/bitacora-seguridad";

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

  const parsed = restablecerContrasenaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const userId = await verificarToken(parsed.data.token, "RECUPERACION_CONTRASENA");
  if (!userId) {
    return NextResponse.json(
      { error: "El enlace es inválido o ha expirado. Solicita uno nuevo." },
      { status: 400 },
    );
  }

  // Verificar HIBP
  const hibp = await verificarContrasenFiltrada(parsed.data.password);
  if (hibp.filtrada) {
    return NextResponse.json(
      {
        error:
          `Esta contraseña apareció en ${hibp.conteo.toLocaleString("es-MX")} filtraciones conocidas. ` +
          "Elige una contraseña diferente que no haya sido expuesta.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashContrasena(parsed.data.password);

  // Actualizar contraseña e incrementar sessionVersion para invalidar todas las sesiones
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  await registrarEvento({
    userId,
    accion: "restablecimiento_contrasena",
    modulo: "recuperacion",
    resultado: "exito",
    ip,
  });

  return NextResponse.json(
    { message: "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña." },
    { status: 200 },
  );
}
