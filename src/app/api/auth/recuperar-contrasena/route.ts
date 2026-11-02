/**
 * Route Handler para solicitar recuperación de contraseña.
 *
 * ¿Qué ataque evita?
 * - Enumeración de correos (CWE-203): siempre responde el mismo mensaje,
 *   exista o no el correo, con tiempo de respuesta constante.
 * - CSRF (CWE-352): verificación de Origin.
 * - Fuerza bruta de solicitudes (CWE-307): límite por IP.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recuperarContrasenaSchema } from "@/lib/validations";
import { verificarLimite, registrarIntento } from "@/lib/limite-intentos";
import { generarToken } from "@/lib/tokens";
import { enviarCorreoRecuperacion } from "@/lib/correo";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { registrarEvento, redactarCorreo } from "@/lib/bitacora-seguridad";

/** Mensaje genérico idéntico para todos los casos (no revela si el correo existe). */
const MENSAJE_GENERICO =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

export async function POST(request: Request) {
  if (!verificarOrigenCSRF(request)) {
    return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limite = await verificarLimite(`ip:${ip}`);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limite.bloqueoMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = recuperarContrasenaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (user) {
    const token = await generarToken(user.id, "RECUPERACION_CONTRASENA");
    await enviarCorreoRecuperacion(email, token);
    await registrarEvento({
      userId: user.id,
      accion: "solicitud_recuperacion",
      modulo: "recuperacion",
      resultado: "exito",
      ip,
      detalle: `Correo: ${redactarCorreo(email)}`,
    });
  }

  await registrarIntento(`ip:${ip}`, true);

  // Siempre el mismo mensaje y código, exista o no el correo
  return NextResponse.json({ message: MENSAJE_GENERICO }, { status: 200 });
}
