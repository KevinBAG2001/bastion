/**
 * Inicia la activación de 2FA: genera secreto TOTP, QR local y clave manual.
 * El secreto queda cifrado como "pendiente" hasta confirmar con un código válido.
 */

import { NextResponse } from "next/server";
import { obtenerSesionAutenticada, respuestaSesionRevocada } from "@/lib/sesion-valida";
import { prisma } from "@/lib/prisma";
import { verificarOrigenCSRF } from "@/lib/csrf";
import {
  rechazarSiSetup2FABloqueado,
  registrarIntentoSetup2FA,
} from "@/lib/setup-2fa-limits";
import {
  cifrarSecretoTotp,
  generarQrDataUrl,
  generarSecretoTotp,
  uriTotp,
} from "@/lib/totp-2fa";

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabledAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (user.totpEnabledAt) {
    await registrarIntentoSetup2FA(session.user.id, false);
    return NextResponse.json(
      { error: "La verificación en dos pasos ya está activa." },
      { status: 400 },
    );
  }

  const secretoPlano = generarSecretoTotp();
  const uri = uriTotp(user.email, secretoPlano);
  const qrDataUrl = await generarQrDataUrl(uri);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpSecretoPendienteCifrado: cifrarSecretoTotp(secretoPlano),
    },
  });

  await registrarIntentoSetup2FA(session.user.id, true);

  return NextResponse.json({
    qrDataUrl,
    claveManual: secretoPlano,
    emisor: "Bastion",
  });
}
