/**
 * Regenera los 10 códigos de respaldo (requiere código TOTP válido).
 */

import { NextResponse } from "next/server";
import { obtenerSesionAutenticada, respuestaSesionRevocada } from "@/lib/sesion-valida";
import { prisma } from "@/lib/prisma";
import { verificarOrigenCSRF } from "@/lib/csrf";
import {
  rechazarSiSetup2FABloqueado,
  registrarIntentoSetup2FA,
} from "@/lib/setup-2fa-limits";
import { confirmarActivacion2FASchema } from "@/lib/validations";
import { verificarSegundoFactor } from "@/lib/verificar-segundo-factor";
import { regenerarCodigosRespaldo } from "@/lib/codigos-respaldo-2fa";
import { registrarEvento } from "@/lib/bitacora-seguridad";

export async function POST(request: Request) {
  if (!verificarOrigenCSRF(request)) {
    return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
  }

  const session = await obtenerSesionAutenticada();
  if (!session?.user?.id) {
    return respuestaSesionRevocada();
  }

  const bloqueo = await rechazarSiSetup2FABloqueado(session.user.id);
  if (bloqueo) {
    return bloqueo;
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
    select: { totpEnabledAt: true },
  });

  if (!user?.totpEnabledAt) {
    return NextResponse.json(
      { error: "Activa primero la verificación en dos pasos." },
      { status: 400 },
    );
  }

  const segundoFactor = await verificarSegundoFactor(session.user.id, parsed.data.codigo, {
    evitarReplay: false,
  });
  if (!segundoFactor.valido || segundoFactor.tipo !== "totp") {
    await registrarIntentoSetup2FA(session.user.id, false);
    return NextResponse.json({ error: "Código TOTP incorrecto." }, { status: 400 });
  }

  const codigosRespaldo = await regenerarCodigosRespaldo(session.user.id);

  await registrarEvento({
    userId: session.user.id,
    accion: "totp_codigos_respaldo_regenerados",
    modulo: "2fa",
    resultado: "exito",
  });

  await registrarIntentoSetup2FA(session.user.id, true);

  return NextResponse.json({ codigosRespaldo });
}
