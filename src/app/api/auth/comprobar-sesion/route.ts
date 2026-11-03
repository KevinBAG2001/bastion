/**
 * Comprobación de sesión en Node (Prisma). Usada por el middleware Edge
 * cuando hay cookie JWT pero no puede consultar sessionVersion localmente.
 *
 * Lección: separar “JWT firmado” de “sesión autorizada” evita que un token robado
 * siga válido tras cerrar todas las sesiones (CWE-613).
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { respuestaSesionRevocada } from "@/lib/sesion-valida";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return respuestaSesionRevocada();
  }

  return NextResponse.json({ ok: true });
}
