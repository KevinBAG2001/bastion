/**
 * Verificación de correo + contraseña sin crear sesión JWT.
 * Usado en login en dos fases cuando el usuario tiene 2FA activo.
 */

import { compare } from "bcryptjs";
import { verificarContrasena } from "@/lib/argon2";
import { prisma } from "@/lib/prisma";

async function verificarHash(contrasena: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2id$")) {
    return verificarContrasena(contrasena, hash);
  }
  return compare(contrasena, hash);
}

async function consumirTiempoConstante(): Promise<void> {
  await verificarContrasena(
    "tiempo-constante-dummy",
    "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ).catch(() => {});
}

export interface UsuarioAutenticadoParcial {
  id: string;
  email: string;
  name: string;
  xp: number;
  level: number;
  sessionVersion: number;
  totpActivo: boolean;
}

/**
 * Verifica credenciales. Devuelve null si fallan (mensaje genérico al cliente).
 */
export async function verificarCredenciales(
  email: string,
  contrasena: string,
): Promise<UsuarioAutenticadoParcial | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      xp: true,
      level: true,
      emailVerifiedAt: true,
      sessionVersion: true,
      totpEnabledAt: true,
    },
  });

  if (!user) {
    await consumirTiempoConstante();
    return null;
  }

  const valid = await verificarHash(contrasena, user.passwordHash);
  if (!valid) {
    return null;
  }

  if (!user.emailVerifiedAt) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    xp: user.xp,
    level: user.level,
    sessionVersion: user.sessionVersion,
    totpActivo: user.totpEnabledAt !== null,
  };
}
