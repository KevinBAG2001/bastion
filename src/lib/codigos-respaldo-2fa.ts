/**
 * Códigos de respaldo de un solo uso para 2FA.
 *
 * ¿Qué ataque evita?
 * - Bloqueo permanente si pierdes el teléfono: los códigos de respaldo permiten
 *   entrar una vez cada uno, sin depender del autenticador.
 * - Robo desde BD (CWE-257): solo se guarda el hash SHA-256; el plano se muestra una vez.
 * - Adivinación (CWE-330): los códigos nuevos usan ≥80 bits de entropía (16 chars base32).
 *
 * Lección (M1): los códigos antiguos de 32 bits (hex corto) siguen siendo válidos hasta
 * que los uses o regeneres el lote; conviene regenerarlos tras actualizar Bastion.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const CANTIDAD_CODIGOS_RESPALDO = 10;

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Codifica bytes en base32 RFC 4648 sin padding. */
export function bytesABase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALFABETO_BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALFABETO_BASE32[(value << (5 - bits)) & 31];
  }

  return output;
}

/** 80 bits → 16 caracteres base32 en cuatro grupos legibles. */
function generarCodigoPlano(): string {
  const raw = bytesABase32(randomBytes(10)).slice(0, 16);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
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

export function normalizarCodigoRespaldo(codigo: string): string {
  return codigo.replace(/\s/g, "").toLowerCase();
}

/** Formato legado (32 bits) o nuevo (≥80 bits base32). */
export function esFormatoCodigoRespaldo(normalizado: string): boolean {
  if (/^[0-9a-f]{4}-[0-9a-f]{4}$/.test(normalizado)) {
    return true;
  }
  return /^[a-z2-7]{4}(-[a-z2-7]{4}){3}$/.test(normalizado);
}

export function evaluarCodigoRespaldo(codigoIngresado: string): {
  valido: boolean;
  normalizado?: string;
} {
  const normalizado = normalizarCodigoRespaldo(codigoIngresado);
  if (!esFormatoCodigoRespaldo(normalizado)) {
    return { valido: false };
  }
  return { valido: true, normalizado };
}

type ClienteTx = Prisma.TransactionClient;

export async function consumirCodigoRespaldoAtomico(
  tx: ClienteTx,
  userId: string,
  codigoNormalizado: string,
): Promise<boolean> {
  const hash = hashToken(codigoNormalizado);
  const actualizado = await tx.codigoRespaldo2FA.updateMany({
    where: { userId, codigoHash: hash, usedAt: null },
    data: { usedAt: new Date() },
  });
  return actualizado.count === 1;
}

/**
 * Intenta consumir un código de respaldo. Devuelve true si era válido y no usado.
 */
export async function verificarCodigoRespaldo(
  userId: string,
  codigoIngresado: string,
): Promise<boolean> {
  const evaluacion = evaluarCodigoRespaldo(codigoIngresado);
  if (!evaluacion.valido || !evaluacion.normalizado) {
    return false;
  }

  return prisma.$transaction(async (tx) =>
    consumirCodigoRespaldoAtomico(tx, userId, evaluacion.normalizado!),
  );
}
