/**
 * Configuración compartida de Auth.js compatible con Edge Runtime.
 *
 * Este archivo NO importa Prisma, bcryptjs, argon2 ni node:crypto.
 * Lo usa el middleware (Edge) para verificar sesión y proteger rutas.
 * El provider Credentials con lógica de authorize vive en src/auth.ts (Node).
 */

import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14, // 14 días
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/iniciar-sesion",
  },
  trustHost: true,
};

export default authConfig;
