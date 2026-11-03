/**
 * Route Handler para cerrar sesión en todos los dispositivos.
 *
 * ¿Qué ataque evita?
 * - Persistencia de sesiones robadas (CWE-613): al incrementar sessionVersion,
 *   todos los JWT existentes se invalidan en la siguiente comprobación.
 * - Acceso no autorizado desde dispositivos olvidados.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEvento } from "@/lib/bitacora-seguridad";
import { verificarOrigenCSRF } from "@/lib/csrf";
import {
  borrarCookieSesionEnRespuesta,
  obtenerSesionAutenticada,
  respuestaSesionRevocada,
} from "@/lib/sesion-valida";
import { ipClienteDesdeRequest } from "@/lib/ip-cliente";

export async function POST(request: Request) {
  // B3: toda mutación autenticada por Route Handler exige Origin/Referer legítimo (CWE-352).
  if (!verificarOrigenCSRF(request)) {
    return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
  }

  const session = await obtenerSesionAutenticada();
  if (!session?.user?.id) {
    return respuestaSesionRevocada();
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  const ip = ipClienteDesdeRequest(request);

  await registrarEvento({
    userId: session.user.id,
    accion: "cierre_todas_sesiones",
    modulo: "sesion",
    resultado: "exito",
    ip,
  });

  const respuesta = NextResponse.json(
    { message: "Todas las sesiones han sido cerradas." },
    { status: 200 },
  );
  borrarCookieSesionEnRespuesta(respuesta);
  return respuesta;
}
