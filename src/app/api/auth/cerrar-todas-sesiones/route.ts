/**
 * Route Handler para cerrar sesión en todos los dispositivos.
 *
 * ¿Qué ataque evita?
 * - Persistencia de sesiones robadas (CWE-613): al incrementar sessionVersion,
 *   todos los JWT existentes se invalidan en el próximo refresco.
 * - Acceso no autorizado desde dispositivos olvidados.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registrarEvento } from "@/lib/bitacora-seguridad";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  await registrarEvento({
    userId: session.user.id,
    accion: "cierre_todas_sesiones",
    modulo: "sesion",
    resultado: "exito",
    ip,
  });

  return NextResponse.json(
    { message: "Todas las sesiones han sido cerradas." },
    { status: 200 },
  );
}
