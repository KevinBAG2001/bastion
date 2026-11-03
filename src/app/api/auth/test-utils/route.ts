/**
 * Endpoint auxiliar para pruebas e2e (M6).
 *
 * Lección: el archivo viaja en el build de producción; no basta ocultarlo con un flag.
 * - BASTION_E2E=1 habilita el endpoint en desarrollo.
 * - Con NODE_ENV=production (p. ej. `pnpm start` en CI) además exige BASTION_E2E_SECRET
 *   y la cabecera x-bastion-e2e-secret — generados en el workflow, nunca en el repo.
 * - Sin esas condiciones → 404 (misma respuesta que si no existiera).
 */

import { NextResponse } from "next/server";
import { generateSync } from "otplib";
import { prisma } from "@/lib/prisma";
import { descifrarSecretoTotp } from "@/lib/totp-2fa";
import { obtenerTokenE2e } from "@/lib/correo";
import { testUtilsE2ePermitido } from "@/lib/test-utils-e2e";
import type { TipoToken } from "@prisma/client";

export async function GET(request: Request) {
  if (!testUtilsE2ePermitido(request)) {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase();
  const tipo = (searchParams.get("tipo") ?? "VERIFICACION_CORREO") as TipoToken;
  const accion = searchParams.get("accion");

  if (!email) {
    return NextResponse.json({ error: "email requerido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      totpSecretCifrado: true,
      totpSecretoPendienteCifrado: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (accion === "totp-generar") {
    const cifrado = user.totpSecretCifrado ?? user.totpSecretoPendienteCifrado;
    if (!cifrado) {
      return NextResponse.json({ error: "2FA no configurado." }, { status: 404 });
    }
    const secreto = descifrarSecretoTotp(cifrado);
    const token = generateSync({ secret: secreto });
    return NextResponse.json({ token });
  }

  if (accion === "token" && tipo === "RECUPERACION_CONTRASENA") {
    const token = obtenerTokenE2e(email, tipo);
    if (!token) {
      return NextResponse.json({ error: "Sin token pendiente." }, { status: 404 });
    }
    return NextResponse.json({ token });
  }

  if (tipo !== "VERIFICACION_CORREO") {
    return NextResponse.json(
      { error: "Tipo no soportado para verificación automática." },
      { status: 400 },
    );
  }

  const tokenRecord = await prisma.tokenVerificacion.findFirst({
    where: {
      userId: user.id,
      tipo: "VERIFICACION_CORREO",
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { tokenHash: true, id: true },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Sin token pendiente." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  await prisma.tokenVerificacion.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ verified: true });
}
