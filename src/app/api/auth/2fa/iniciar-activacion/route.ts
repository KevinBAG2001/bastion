/**
 * Inicia la activación de 2FA: genera secreto TOTP, QR local y clave manual.
 * El secreto queda cifrado como "pendiente" hasta confirmar con un código válido.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verificarOrigenCSRF } from "@/lib/csrf";
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

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabledAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (user.totpEnabledAt) {
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

  return NextResponse.json({
    qrDataUrl,
    claveManual: secretoPlano,
    emisor: "Bastion",
  });
}
