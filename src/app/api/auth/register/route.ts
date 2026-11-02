/**
 * Route Handler de registro de usuarios.
 *
 * Protecciones implementadas:
 * - Validación zod estricta (mínimo 10 caracteres, carácter especial).
 * - Hash Argon2id (resistencia a GPU/ASIC, CWE-916).
 * - Verificación HIBP k-anonymity (contraseñas filtradas, CWE-521).
 * - Límite de intentos por IP en PostgreSQL (CWE-307).
 * - Mensaje genérico que no revela si el correo existe (CWE-203).
 * - Verificación CSRF del Origin (CWE-352).
 * - Token de verificación de correo (CWE-345).
 * - Bitácora de seguridad sin datos sensibles (CWE-778).
 * - Tiempo de respuesta constante razonable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { hashContrasena } from "@/lib/argon2";
import { verificarContrasenFiltrada } from "@/lib/hibp";
import { verificarLimite, registrarIntento } from "@/lib/limite-intentos";
import { generarToken } from "@/lib/tokens";
import { enviarCorreoVerificacion } from "@/lib/correo";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { registrarEvento, redactarCorreo } from "@/lib/bitacora-seguridad";

export async function POST(request: Request) {
  // Verificación CSRF: el Origin debe coincidir con el host de la app
  if (!verificarOrigenCSRF(request)) {
    await registrarEvento({
      accion: "csrf_rechazado",
      modulo: "registro",
      resultado: "bloqueado",
      ip: obtenerIP(request),
    });
    return NextResponse.json(
      { error: "Solicitud no autorizada." },
      { status: 403 },
    );
  }

  const ip = obtenerIP(request);

  // Límite de intentos por IP (bloqueo progresivo en PostgreSQL)
  const limite = await verificarLimite(`ip:${ip}`);
  if (!limite.permitido) {
    await registrarEvento({
      accion: "login_bloqueado",
      modulo: "registro",
      resultado: "bloqueado",
      ip,
      detalle: `IP bloqueada, ${limite.intentosFallidos} intentos`,
    });
    return NextResponse.json(
      {
        error: "Demasiados intentos. Espera unos minutos antes de volver a intentar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limite.bloqueoMs / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  // Verificar si la contraseña aparece en filtraciones conocidas (HIBP k-anonymity)
  const hibp = await verificarContrasenFiltrada(parsed.data.password);
  if (hibp.filtrada) {
    return NextResponse.json(
      {
        error:
          `Esta contraseña apareció en ${hibp.conteo.toLocaleString("es-MX")} filtraciones de datos conocidas. ` +
          "Esto no significa que tu cuenta haya sido comprometida, pero te recomendamos " +
          "elegir una contraseña diferente que no haya sido expuesta públicamente. " +
          "Puedes verificar en haveibeenpwned.com.",
      },
      { status: 400 },
    );
  }
  if (hibp.error) {
    // HIBP no respondió; registrar advertencia pero permitir el registro
    console.warn("[registro] No se pudo verificar HIBP; se permite el registro.");
  }

  const email = parsed.data.email.toLowerCase();

  // Verificar correo existente — mensaje genérico para no revelar si existe (CWE-203)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Consumir tiempo equivalente al hash para mantener tiempo constante
    await hashContrasena(parsed.data.password);
    await registrarIntento(`ip:${ip}`, false);
    // Mensaje idéntico al de éxito para no revelar existencia del correo
    return NextResponse.json(
      {
        message:
          "Si el correo es válido, recibirás un enlace de verificación. Revisa tu bandeja de entrada.",
      },
      { status: 201 },
    );
  }

  const passwordHash = await hashContrasena(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  await registrarIntento(`ip:${ip}`, true, user.id);

  // Generar token de verificación de correo
  const token = await generarToken(user.id, "VERIFICACION_CORREO");
  await enviarCorreoVerificacion(email, token);

  await registrarEvento({
    userId: user.id,
    accion: "registro",
    modulo: "registro",
    resultado: "exito",
    ip,
    detalle: `Correo: ${redactarCorreo(email)}`,
  });

  return NextResponse.json(
    {
      message:
        "Si el correo es válido, recibirás un enlace de verificación. Revisa tu bandeja de entrada.",
    },
    { status: 201 },
  );
}

function obtenerIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
