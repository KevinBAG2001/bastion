/**
 * Valida TOTP o código de respaldo para un usuario con 2FA activo.
 * Evita reutilizar el mismo paso TOTP dentro de su ventana (anti-replay).
 */

import { prisma } from "@/lib/prisma";
import {
  descifrarSecretoTotp,
  verificarCodigoTotp,
} from "@/lib/totp-2fa";
import { verificarCodigoRespaldo } from "@/lib/codigos-respaldo-2fa";

export type TipoCodigo2FA = "totp" | "respaldo";

export interface ResultadoSegundoFactor {
  valido: boolean;
  tipo?: TipoCodigo2FA;
}

export async function verificarSegundoFactor(
  userId: string,
  codigo: string,
): Promise<ResultadoSegundoFactor> {
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
      user.totpUltimoPasoUsado !== null &&
      user.totpUltimoPasoUsado >= totp.pasoUsado
    ) {
      return { valido: false };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpUltimoPasoUsado: totp.pasoUsado },
    });

    return { valido: true, tipo: "totp" };
  }

  const respaldoOk = await verificarCodigoRespaldo(userId, codigo);
  if (respaldoOk) {
    return { valido: true, tipo: "respaldo" };
  }

  return { valido: false };
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
