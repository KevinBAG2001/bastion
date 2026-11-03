/**
 * Generación y verificación de tokens seguros de un solo uso.
 *
 * ¿Qué ataque evita?
 * - Robo de tokens de recuperación desde la base de datos (CWE-257).
 *   Se guarda solo el hash SHA-256 del token; el valor plano se envía una vez.
 * - Reutilización de tokens (CWE-613): cada token tiene caducidad corta y uso único.
 * - Adivinación de tokens (CWE-330): se usan 32 bytes criptográficos aleatorios.
 * - Condiciones de carrera (A5): el consumo usa updateMany condicional dentro de transacciones.
 */

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TipoToken } from "@prisma/client";

/** Caducidad por tipo de token. */
const CADUCIDAD_MS: Record<TipoToken, number> = {
  VERIFICACION_CORREO: 24 * 60 * 60 * 1000,     // 24 horas
  RECUPERACION_CONTRASENA: 30 * 60 * 1000,       // 30 minutos
  LOGIN_PENDIENTE_2FA: 5 * 60 * 1000,             // 5 minutos
};

/**
 * Genera un hash SHA-256 de un token.
 * SHA-256 es adecuado aquí porque el token tiene suficiente entropía (256 bits);
 * no es almacenamiento de contraseña, es integridad de token aleatorio.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Genera un token criptográficamente seguro, lo guarda con hash en la BD
 * y devuelve el valor plano (para enviarlo al usuario una sola vez).
 *
 * Invalida tokens anteriores del mismo tipo para el mismo usuario.
 */
export async function generarToken(
  userId: string,
  tipo: TipoToken,
): Promise<string> {
  // Invalidar tokens anteriores del mismo tipo (previene acumulación)
  await prisma.tokenVerificacion.updateMany({
    where: { userId, tipo, usedAt: null },
    data: { usedAt: new Date() },
  });

  const tokenPlano = randomBytes(32).toString("hex");
  const tokenHashValue = hashToken(tokenPlano);
  const expiresAt = new Date(Date.now() + CADUCIDAD_MS[tipo]);

  await prisma.tokenVerificacion.create({
    data: {
      userId,
      tipo,
      tokenHash: tokenHashValue,
      expiresAt,
    },
  });

  return tokenPlano;
}

/**
 * Consume un token de forma atómica (usedAt IS NULL). Devuelve userId o null.
 * Lección A5: dos solicitudes paralelas no pueden consumir el mismo token.
 */
export async function consumirTokenAtomico(
  tokenPlano: string,
  tipo: TipoToken,
): Promise<string | null> {
  const tokenHashValue = hashToken(tokenPlano);
  const ahora = new Date();

  return prisma.$transaction(async (tx) => {
    const registro = await tx.tokenVerificacion.findFirst({
      where: {
        tokenHash: tokenHashValue,
        tipo,
        usedAt: null,
        expiresAt: { gt: ahora },
      },
    });

    if (!registro) {
      return null;
    }

    const hashBuffer = Buffer.from(registro.tokenHash, "hex");
    const inputBuffer = Buffer.from(tokenHashValue, "hex");
    if (!timingSafeEqual(hashBuffer, inputBuffer)) {
      return null;
    }

    const marcado = await tx.tokenVerificacion.updateMany({
      where: { id: registro.id, usedAt: null },
      data: { usedAt: ahora },
    });

    if (marcado.count !== 1) {
      return null;
    }

    return registro.userId;
  });
}

/**
 * Verifica un token: busca por hash, valida caducidad y uso único.
 * Marca el token como usado si es válido (un solo uso).
 *
 * @returns El userId si el token es válido, null si no.
 */
export async function verificarToken(
  tokenPlano: string,
  tipo: TipoToken,
): Promise<string | null> {
  return consumirTokenAtomico(tokenPlano, tipo);
}

/**
 * Valida un token pendiente sin consumirlo (para comprobar el segundo factor antes).
 */
export async function validarTokenSinConsumir(
  tokenPlano: string,
  tipo: TipoToken,
): Promise<string | null> {
  const tokenHashValue = hashToken(tokenPlano);

  const registro = await prisma.tokenVerificacion.findFirst({
    where: {
      tokenHash: tokenHashValue,
      tipo,
      usedAt: null,
    },
  });

  if (!registro || registro.expiresAt < new Date()) {
    return null;
  }

  const hashBuffer = Buffer.from(registro.tokenHash, "hex");
  const inputBuffer = Buffer.from(tokenHashValue, "hex");
  if (!timingSafeEqual(hashBuffer, inputBuffer)) {
    return null;
  }

  return registro.userId;
}

/** Marca un token como usado tras completar el flujo (p. ej. login 2FA exitoso). */
export async function consumirTokenPorValor(
  tokenPlano: string,
  tipo: TipoToken,
): Promise<boolean> {
  const userId = await consumirTokenAtomico(tokenPlano, tipo);
  return userId !== null;
}
