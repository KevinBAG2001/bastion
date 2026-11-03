/**
 * Endpoint auxiliar habilitado SOLO con BASTION_E2E=1.
 * Permite a las pruebas e2e obtener el token de verificación de correo
 * sin depender de un servicio de correo real, y generar códigos TOTP de prueba.
 *
 * En producción este endpoint NO existe (devuelve 404).
 */

import { NextResponse } from "next/server";
import { generateSync } from "otplib";
import { prisma } from "@/lib/prisma";
import { descifrarSecretoTotp } from "@/lib/totp-2fa";

export async function GET(request: Request) {
  if (process.env.BASTION_E2E !== "1") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase();
  const tipo = searchParams.get("tipo") ?? "VERIFICACION_CORREO";
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

  // Obtener el token más reciente no usado de este tipo
  const tokenRecord = await prisma.tokenVerificacion.findFirst({
    where: {
      userId: user.id,
      tipo: tipo as "VERIFICACION_CORREO" | "RECUPERACION_CONTRASENA" | "LOGIN_PENDIENTE_2FA",
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { tokenHash: true, id: true },
  });

  if (!tokenRecord && tipo === "VERIFICACION_CORREO") {
    return NextResponse.json({ error: "Sin token pendiente." }, { status: 404 });
  }

  if (tipo === "VERIFICACION_CORREO" && tokenRecord) {
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

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
