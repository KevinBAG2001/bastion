/**
 * Segunda fase del login con 2FA: valida token pendiente + TOTP/respaldo.
 */

import { prisma } from "@/lib/prisma";
import {
  consumirTokenPorValor,
  validarTokenSinConsumir,
} from "@/lib/tokens";
import { verificarSegundoFactor } from "@/lib/verificar-segundo-factor";
import { registrarEvento } from "@/lib/bitacora-seguridad";

export async function completarLoginSegundoFactor(
  mfaPendingToken: string,
  mfaCode: string,
) {
  const userId = await validarTokenSinConsumir(
    mfaPendingToken,
    "LOGIN_PENDIENTE_2FA",
  );
  if (!userId) return null;

  const resultado = await verificarSegundoFactor(userId, mfaCode);
  if (!resultado.valido) return null;

  await consumirTokenPorValor(mfaPendingToken, "LOGIN_PENDIENTE_2FA");

  if (resultado.tipo === "respaldo") {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await registrarEvento({
      userId,
      accion: "totp_codigo_respaldo_usado",
      modulo: "login_2fa",
      resultado: "exito",
      detalle: "Inicio de sesión con código de respaldo",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      xp: true,
      level: true,
      sessionVersion: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    xp: user.xp,
    level: user.level,
    sessionVersion: user.sessionVersion,
  };
}
