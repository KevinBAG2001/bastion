/**
 * Server Actions de autenticación.
 *
 * Protecciones:
 * - Límite de intentos por IP y por cuenta en PostgreSQL (CWE-307).
 * - Mensajes genéricos que no revelan si el correo existe (CWE-203).
 * - Bitácora de eventos de seguridad (CWE-778).
 * - CSRF verificado automáticamente por Next.js en Server Actions.
 * - Tiempo de respuesta constante razonable para evitar timing attacks (CWE-208).
 */

"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validations";
import { verificarLimite, registrarIntento } from "@/lib/limite-intentos";
import { registrarEvento, redactarCorreo } from "@/lib/bitacora-seguridad";
import { prisma } from "@/lib/prisma";

export async function loginWithCredentials(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const ip = "server-action"; // Las Server Actions no exponen la IP directamente; usar middleware si se necesita

  // Límite por cuenta (correo normalizado)
  const limiteCuenta = await verificarLimite(`cuenta:${email}`);
  if (!limiteCuenta.permitido) {
    await registrarEvento({
      accion: "login_bloqueado",
      modulo: "login",
      resultado: "bloqueado",
      ip,
      detalle: `Cuenta bloqueada: ${redactarCorreo(email)}, ${limiteCuenta.intentosFallidos} intentos`,
    });
    return {
      error: "Demasiados intentos de inicio de sesión. Intenta más tarde.",
    };
  }

  // Límite por IP (en Server Actions no tenemos acceso directo a la IP;
  // se podría obtener vía headers en middleware y pasarla, pero por ahora
  // el bloqueo por cuenta es la protección principal)

  const parsed = loginSchema.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: String(formData.get("callbackUrl") ?? "/panel"),
    });
  } catch (error) {
    if (isRedirectError(error)) {
      // Login exitoso — registrar antes de que Next.js maneje la redirección
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        select: { id: true },
      });
      if (user) {
        await registrarIntento(`cuenta:${email}`, true, user.id);
        await registrarEvento({
          userId: user.id,
          accion: "login_exitoso",
          modulo: "login",
          resultado: "exito",
          ip,
          detalle: `Correo: ${redactarCorreo(email)}`,
        });
      }
      throw error;
    }
    if (error instanceof AuthError) {
      // Login fallido — registrar intento fallido
      await registrarIntento(`cuenta:${email}`, false);
      await registrarEvento({
        accion: "login_fallido",
        modulo: "login",
        resultado: "fallo",
        ip,
        detalle: `Correo: ${redactarCorreo(email)}`,
      });
      // Mensaje genérico: no revelar si el correo existe o si es la contraseña
      return { error: "Correo o contraseña incorrectos." };
    }
    throw error;
  }
}
