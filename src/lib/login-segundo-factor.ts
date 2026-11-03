/**
 * Segunda fase del login con 2FA: valida token pendiente + TOTP/respaldo.
 * Transacción atómica: token LOGIN_PENDIENTE_2FA + anti-replay TOTP/respaldo (A5).
 */

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import {
  aplicarSegundoFactorAtomico,
  evaluarSegundoFactor,
} from "@/lib/verificar-segundo-factor";
import { registrarEvento } from "@/lib/bitacora-seguridad";

export async function completarLoginSegundoFactor(
  mfaPendingToken: string,
  mfaCode: string,
) {
  const userIdPeek = await prisma.tokenVerificacion.findFirst({
    where: {
      tokenHash: hashToken(mfaPendingToken),
      tipo: "LOGIN_PENDIENTE_2FA",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!userIdPeek) {
    return null;
  }

  const evaluacion = await evaluarSegundoFactor(userIdPeek.userId, mfaCode);
  if (!evaluacion.valido) {
    return null;
  }

  const tokenHashValue = hashToken(mfaPendingToken);
  const ahora = new Date();

  const confirmado = await prisma.$transaction(async (tx) => {
    const tokenMarcado = await tx.tokenVerificacion.updateMany({
      where: {
        tokenHash: tokenHashValue,
        tipo: "LOGIN_PENDIENTE_2FA",
        usedAt: null,
        expiresAt: { gt: ahora },
      },
      data: { usedAt: ahora },
    });

    if (tokenMarcado.count !== 1) {
      return false;
    }

    const factorOk = await aplicarSegundoFactorAtomico(
      tx,
      userIdPeek.userId,
      evaluacion,
    );
    if (!factorOk) {
      throw new Error("rollback-2fa");
    }

    if (evaluacion.tipo === "respaldo") {
      await tx.user.update({
        where: { id: userIdPeek.userId },
        data: { sessionVersion: { increment: 1 } },
      });
    }

    return true;
  }).catch(() => false);

  if (!confirmado) {
    return null;
  }

  if (evaluacion.tipo === "respaldo") {
    await registrarEvento({
      userId: userIdPeek.userId,
      accion: "totp_codigo_respaldo_usado",
      modulo: "login_2fa",
      resultado: "exito",
      detalle: "Inicio de sesión con código de respaldo",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userIdPeek.userId },
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
