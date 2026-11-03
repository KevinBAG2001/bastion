/**
 * Confirma la activación de 2FA con un código TOTP válido del secreto pendiente.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { confirmarActivacion2FASchema } from "@/lib/validations";
import {
  cifrarSecretoTotp,
  descifrarSecretoTotp,
  verificarCodigoTotp,
} from "@/lib/totp-2fa";
import { regenerarCodigosRespaldo } from "@/lib/codigos-respaldo-2fa";
import { registrarEvento } from "@/lib/bitacora-seguridad";
export async function POST(request: Request) {
  if (!verificarOrigenCSRF(request)) {
    return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = confirmarActivacion2FASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      totpEnabledAt: true,
      totpSecretoPendienteCifrado: true,
    },
  });

  if (!user?.totpSecretoPendienteCifrado) {
    return NextResponse.json(
      { error: "No hay activación pendiente. Inicia el proceso de nuevo." },
      { status: 400 },
    );
  }

  if (user.totpEnabledAt) {
    return NextResponse.json(
      { error: "La verificación en dos pasos ya está activa." },
      { status: 400 },
    );
  }

  const secretoPendiente = descifrarSecretoTotp(user.totpSecretoPendienteCifrado);
  const verificacion = verificarCodigoTotp(secretoPendiente, parsed.data.codigo);
  if (!verificacion.valido) {
    return NextResponse.json({ error: "Código incorrecto. Intenta de nuevo." }, { status: 400 });
  }

  const secretoCifrado = cifrarSecretoTotp(secretoPendiente);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpEnabledAt: new Date(),
      totpSecretCifrado: secretoCifrado,
      totpSecretoPendienteCifrado: null,
      // totpUltimoPasoUsado se actualiza solo en login (anti-replay), no al activar.
      totpUltimoPasoUsado: null,
      sessionVersion: { increment: 1 },
    },
  });

  const codigosRespaldo = await regenerarCodigosRespaldo(session.user.id);

  await registrarEvento({
    userId: session.user.id,
    accion: "totp_activado",
    modulo: "2fa",
    resultado: "exito",
    detalle: "TOTP activado tras confirmación",
  });

  return NextResponse.json({
    message: "Verificación en dos pasos activada.",
    codigosRespaldo,
  });
}
