/**
 * Endpoint auxiliar habilitado SOLO con BASTION_E2E=1.
 * Permite a las pruebas e2e obtener el token de verificación de correo
 * sin depender de un servicio de correo real.
 *
 * En producción este endpoint NO existe (devuelve 404).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTokenE2e } from "@/lib/correo";
import type { TipoToken } from "@prisma/client";

export async function GET(request: Request) {
  if (process.env.BASTION_E2E !== "1") {
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
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (accion === "token" && tipo === "RECUPERACION_CONTRASENA") {
    const token = obtenerTokenE2e(email, tipo);
    if (!token) {
      return NextResponse.json({ error: "Sin token pendiente." }, { status: 404 });
    }
    return NextResponse.json({ token });
  }

  if (tipo !== "VERIFICACION_CORREO") {
    return NextResponse.json({ error: "Tipo no soportado para verificación automática." }, { status: 400 });
  }

  // Obtener el token más reciente no usado de este tipo
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

  // En pruebas e2e, también guardamos el token plano en la BD para poder recuperarlo.
  // Como alternativa, buscamos el token por su hash y permitimos verificar directamente.
  // El endpoint de verificación acepta el token plano, así que forzamos la verificación
  // directamente actualizando emailVerifiedAt.
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  // Marcar el token como usado
  await prisma.tokenVerificacion.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ verified: true });
}
