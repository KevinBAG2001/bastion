/**
 * Rate limit para operaciones de configuración 2FA (M2).
 *
 * Lección: el login ya limita intentos; activar/regenerar/desactivar 2FA también
 * debe frenar fuerza bruta contra TOTP y contraseña (CWE-307).
 */

import { NextResponse } from "next/server";
import { registrarIntento, verificarLimite } from "@/lib/limite-intentos";

export function llaveLimiteSetup2FA(userId: string): string {
  return `2fa:setup:${userId}`;
}

export async function rechazarSiSetup2FABloqueado(
  userId: string,
): Promise<NextResponse | null> {
  const limite = await verificarLimite(llaveLimiteSetup2FA(userId));
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos de configuración. Intenta más tarde." },
      { status: 429 },
    );
  }
  return null;
}

export async function registrarIntentoSetup2FA(
  userId: string,
  exito: boolean,
): Promise<void> {
  await registrarIntento(llaveLimiteSetup2FA(userId), exito, userId);
}
