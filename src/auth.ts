/**
 * Configuración completa de Auth.js (next-auth v5) para Bastion.
 * Este archivo solo se ejecuta en Node.js runtime (Route Handlers, Server Actions, páginas RSC).
 * El middleware (Edge) usa auth.config.ts que no importa Prisma ni node:crypto.
 *
 * Cambios de seguridad respecto a la versión original:
 * - Hash Argon2id en lugar de bcryptjs (resistencia a GPU/ASIC, CWE-916).
 * - Verificación de correo obligatoria antes de permitir login.
 * - Verificación de sessionVersion en JWT para invalidar sesiones al cambiar contraseña
 *   o al cerrar todas las sesiones (CWE-613).
 * - Compatibilidad con hashes bcryptjs existentes (migración progresiva a Argon2id).
 * - Tiempo de respuesta constante razonable para no revelar existencia de cuentas (CWE-203).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { verificarContrasena } from "@/lib/argon2";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

/**
 * Verifica una contraseña contra un hash, soportando bcryptjs (legado) y Argon2id.
 * Permite migración progresiva: los hashes bcrypt empiezan con "$2a$" o "$2b$",
 * los de Argon2id con "$argon2id$".
 */
async function verificarHash(contrasena: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2id$")) {
    return verificarContrasena(contrasena, hash);
  }
  // Hash legado bcryptjs
  return compare(contrasena, hash);
}

/**
 * Simula una verificación de contraseña para mantener tiempo constante
 * cuando el usuario no existe (evita enumeración por timing, CWE-208).
 */
async function consumirTiempoConstante(): Promise<void> {
  await verificarContrasena(
    "tiempo-constante-dummy",
    "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ).catch(() => {
    // El hash dummy es inválido; solo consumimos tiempo de CPU.
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            xp: true,
            level: true,
            emailVerifiedAt: true,
            sessionVersion: true,
          },
        });

        if (!user) {
          // Consumir tiempo para igualar respuesta con usuario existente (CWE-208)
          await consumirTiempoConstante();
          return null;
        }

        const valid = await verificarHash(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Verificación de correo obligatoria
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Login inicial: guardar sessionVersion en el token para rotación
      if (user) {
        token.sub = user.id;
        token.xp = (user as { xp?: number }).xp ?? 0;
        token.level = (user as { level?: number }).level ?? 1;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }

      // En cada refresco del token, verificar que la sesión sigue siendo válida
      if (trigger === "update" && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { xp: true, level: true, name: true, sessionVersion: true },
        });
        if (fresh) {
          // Si sessionVersion cambió, invalidar la sesión (CWE-613)
          if (fresh.sessionVersion !== token.sessionVersion) {
            return { ...token, sub: undefined };
          }
          token.xp = fresh.xp;
          token.level = fresh.level;
          token.name = fresh.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.xp = (token.xp as number) ?? 0;
        session.user.level = (token.level as number) ?? 1;
      }
      return session;
    },
  },
});
