/**
 * Códigos de respaldo de un solo uso para 2FA.
 *
 * ¿Qué ataque evita?
 * - Bloqueo permanente si pierdes el teléfono: los códigos de respaldo permiten
 *   entrar una vez cada uno, sin depender del autenticador.
 * - Robo desde BD (CWE-257): solo se guarda el hash SHA-256; el plano se muestra una vez.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const CANTIDAD_CODIGOS_RESPALDO = 10;

/** Formato legible: 8 caracteres hex en dos grupos (p. ej. a1b2-c3d4). */
function generarCodigoPlano(): string {
  const raw = randomBytes(4).toString("hex");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/**
 * Reemplaza todos los códigos de respaldo del usuario y devuelve los valores planos
 * (mostrar una sola vez al usuario).
 */
export async function regenerarCodigosRespaldo(
  userId: string,
): Promise<string[]> {
  const planos = Array.from({ length: CANTIDAD_CODIGOS_RESPALDO }, () =>
    generarCodigoPlano(),
  );

  await prisma.$transaction([
    prisma.codigoRespaldo2FA.deleteMany({ where: { userId } }),
    prisma.codigoRespaldo2FA.createMany({
      data: planos.map((codigo) => ({
        userId,
        codigoHash: hashToken(normalizarCodigoRespaldo(codigo)),
      })),
    }),
  ]);

  return planos;
}

function normalizarCodigoRespaldo(codigo: string): string {
  return codigo.replace(/\s/g, "").toLowerCase();
}

/**
 * Intenta consumir un código de respaldo. Devuelve true si era válido y no usado.
 */
export async function verificarCodigoRespaldo(
  userId: string,
  codigoIngresado: string,
): Promise<boolean> {
  const normalizado = normalizarCodigoRespaldo(codigoIngresado);
  if (!/^[0-9a-f]{4}-[0-9a-f]{4}$/.test(normalizado)) {
    return false;
  }

  const hash = hashToken(normalizado);
  const registro = await prisma.codigoRespaldo2FA.findFirst({
    where: { userId, codigoHash: hash, usedAt: null },
  });

  if (!registro) {
    return false;
  }

  await prisma.codigoRespaldo2FA.update({
    where: { id: registro.id },
    data: { usedAt: new Date() },
  });

  return true;
}
