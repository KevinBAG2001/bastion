/**
 * Valida TOTP o código de respaldo para un usuario con 2FA activo.
 * Evita reutilizar el mismo paso TOTP (anti-replay) con actualizaciones atómicas (A5).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  descifrarSecretoTotp,
  verificarCodigoTotp,
} from "@/lib/totp-2fa";
import {
  consumirCodigoRespaldoAtomico,
  evaluarCodigoRespaldo,
} from "@/lib/codigos-respaldo-2fa";

export type TipoCodigo2FA = "totp" | "respaldo";

export interface ResultadoSegundoFactor {
  valido: boolean;
  tipo?: TipoCodigo2FA;
}

export interface EvaluacionSegundoFactor {
  valido: boolean;
  tipo?: TipoCodigo2FA;
  pasoUsado?: number;
  codigoRespaldoNormalizado?: string;
}

type ClienteTx = Prisma.TransactionClient;

/** Solo lectura: comprueba el código sin escribir en BD (para transacciones atómicas). */
export async function evaluarSegundoFactor(
  userId: string,
  codigo: string,
  opciones?: { evitarReplay?: boolean },
): Promise<EvaluacionSegundoFactor> {
  const evitarReplay = opciones?.evitarReplay ?? true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totpEnabledAt: true,
      totpSecretCifrado: true,
      totpUltimoPasoUsado: true,
    },
  });

  if (!user?.totpEnabledAt || !user.totpSecretCifrado) {
    return { valido: false };
  }

  const secreto = descifrarSecretoTotp(user.totpSecretCifrado);
  const totp = verificarCodigoTotp(secreto, codigo);

  if (totp.valido && totp.pasoUsado !== undefined) {
    if (
      evitarReplay &&
      user.totpUltimoPasoUsado !== null &&
      user.totpUltimoPasoUsado >= totp.pasoUsado
    ) {
      return { valido: false };
    }

    return { valido: true, tipo: "totp", pasoUsado: totp.pasoUsado };
  }

  const respaldo = evaluarCodigoRespaldo(codigo);
  if (respaldo.valido) {
    return {
      valido: true,
      tipo: "respaldo",
      codigoRespaldoNormalizado: respaldo.normalizado,
    };
  }

  return { valido: false };
}

/** Persiste TOTP o respaldo con updateMany condicional (count=0 → replay o carrera). */
export async function aplicarSegundoFactorAtomico(
  tx: ClienteTx,
  userId: string,
  evaluacion: EvaluacionSegundoFactor,
  opciones?: { evitarReplay?: boolean },
): Promise<boolean> {
  if (!evaluacion.valido || !evaluacion.tipo) {
    return false;
  }

  const evitarReplay = opciones?.evitarReplay ?? true;

  if (evaluacion.tipo === "totp" && evaluacion.pasoUsado !== undefined) {
    if (!evitarReplay) {
      await tx.user.update({
        where: { id: userId },
        data: { totpUltimoPasoUsado: evaluacion.pasoUsado },
      });
      return true;
    }

    const actualizado = await tx.user.updateMany({
      where: {
        id: userId,
        totpEnabledAt: { not: null },
        OR: [
          { totpUltimoPasoUsado: null },
          { totpUltimoPasoUsado: { lt: evaluacion.pasoUsado } },
        ],
      },
      data: { totpUltimoPasoUsado: evaluacion.pasoUsado },
    });
    return actualizado.count === 1;
  }

  if (evaluacion.tipo === "respaldo" && evaluacion.codigoRespaldoNormalizado) {
    return consumirCodigoRespaldoAtomico(
      tx,
      userId,
      evaluacion.codigoRespaldoNormalizado,
    );
  }

  return false;
}

export async function verificarSegundoFactor(
  userId: string,
  codigo: string,
  opciones?: { evitarReplay?: boolean },
): Promise<ResultadoSegundoFactor> {
  const evaluacion = await evaluarSegundoFactor(userId, codigo, opciones);
  if (!evaluacion.valido) {
    return { valido: false };
  }

  const confirmado = await prisma.$transaction(async (tx) =>
    aplicarSegundoFactorAtomico(tx, userId, evaluacion, opciones),
  );

  if (!confirmado) {
    return { valido: false };
  }

  return { valido: true, tipo: evaluacion.tipo };
}

/** Invalida sesiones JWT incrementando sessionVersion (CWE-613). */
export async function incrementarSessionVersion(userId: string): Promise<number> {
  const actualizado = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return actualizado.sessionVersion;
}
