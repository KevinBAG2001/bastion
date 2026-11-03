/**
 * Desactiva 2FA: requiere contraseña actual y un código TOTP válido.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verificarOrigenCSRF } from "@/lib/csrf";
import { desactivar2FASchema } from "@/lib/validations";
import { verificarCredenciales } from "@/lib/verificar-credenciales";
import { verificarSegundoFactor, incrementarSessionVersion } from "@/lib/verificar-segundo-factor";
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

  const parsed = desactivar2FASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabledAt: true },
  });

  if (!user?.totpEnabledAt) {
    return NextResponse.json(
      { error: "La verificación en dos pasos no está activa." },
      { status: 400 },
    );
  }

  const credenciales = await verificarCredenciales(user.email, parsed.data.password);
  if (!credenciales) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 400 });
  }

  const segundoFactor = await verificarSegundoFactor(session.user.id, parsed.data.codigo);
  if (!segundoFactor.valido || segundoFactor.tipo !== "totp") {
    return NextResponse.json(
      { error: "Código TOTP incorrecto. Los códigos de respaldo no aplican aquí." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.codigoRespaldo2FA.deleteMany({ where: { userId: session.user.id } }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        totpEnabledAt: null,
        totpSecretCifrado: null,
        totpSecretoPendienteCifrado: null,
        totpUltimoPasoUsado: null,
      },
    }),
  ]);

  await incrementarSessionVersion(session.user.id);

  await registrarEvento({
    userId: session.user.id,
    accion: "totp_desactivado",
    modulo: "2fa",
    resultado: "exito",
  });

  return NextResponse.json({ message: "Verificación en dos pasos desactivada." });
}
