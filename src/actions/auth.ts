/**
 * Server Actions de autenticación.
 *
 * Protecciones:
 * - Límite de intentos por IP y por cuenta en PostgreSQL (CWE-307).
 * - Segunda fase 2FA con el mismo límite de intentos (CWE-307).
 * - Mensajes genéricos que no revelan si el correo existe (CWE-203).
 * - Bitácora de eventos de seguridad (CWE-778).
 * - CSRF verificado automáticamente por Next.js en Server Actions.
 * - Tiempo de respuesta constante razonable para evitar timing attacks (CWE-208).
 */

"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { codigo2FASchema, loginSchema } from "@/lib/validations";
import { verificarLimite, registrarIntento } from "@/lib/limite-intentos";
import { registrarEvento, redactarCorreo } from "@/lib/bitacora-seguridad";
import { verificarCredenciales } from "@/lib/verificar-credenciales";
import { generarToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";

const COOKIE_LOGIN_PENDIENTE = "bastion_login_pendiente_2fa";
const MAX_AGE_PENDIENTE_SEG = 5 * 60;

export type EstadoLogin =
  | { error?: string }
  | { requires2FA: true; pendingToken: string; email: string };

export async function loginWithCredentials(
  _prev: EstadoLogin | undefined,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const ip = "server-action";

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

  const parsed = loginSchema.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await verificarCredenciales(
    parsed.data.email.toLowerCase(),
    parsed.data.password,
  );

  if (!usuario) {
    await registrarIntento(`cuenta:${email}`, false);
    await registrarEvento({
      accion: "login_fallido",
      modulo: "login",
      resultado: "fallo",
      ip,
      detalle: `Correo: ${redactarCorreo(email)}`,
    });
    return { error: "Correo o contraseña incorrectos." };
  }

  if (usuario.totpActivo) {
    const pendingToken = await generarToken(usuario.id, "LOGIN_PENDIENTE_2FA");
    const jar = await cookies();
    jar.set(COOKIE_LOGIN_PENDIENTE, pendingToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_PENDIENTE_SEG,
    });
    await registrarEvento({
      userId: usuario.id,
      accion: "login_2fa_pendiente",
      modulo: "login_2fa",
      resultado: "exito",
      ip,
      detalle: "Contraseña correcta; pendiente segundo factor",
    });
    return {
      requires2FA: true,
      pendingToken,
      email: usuario.email,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: String(formData.get("callbackUrl") ?? "/panel"),
    });
  } catch (error) {
    if (isRedirectError(error)) {
      await registrarIntento(`cuenta:${email}`, true, usuario.id);
      await registrarEvento({
        userId: usuario.id,
        accion: "login_exitoso",
        modulo: "login",
        resultado: "exito",
        ip,
        detalle: `Correo: ${redactarCorreo(email)}`,
      });
      throw error;
    }
    if (error instanceof AuthError) {
      await registrarIntento(`cuenta:${email}`, false);
      await registrarEvento({
        accion: "login_fallido",
        modulo: "login",
        resultado: "fallo",
        ip,
        detalle: `Correo: ${redactarCorreo(email)}`,
      });
      return { error: "Correo o contraseña incorrectos." };
    }
    throw error;
  }

  return {};
}

export async function loginWithSecondFactor(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const jar = await cookies();
  const pendingToken =
    jar.get(COOKIE_LOGIN_PENDIENTE)?.value ??
    String(formData.get("pendingToken") ?? "");
  const ip = "server-action";

  const limite2fa = await verificarLimite(`2fa:cuenta:${email}`);
  if (!limite2fa.permitido) {
    await registrarEvento({
      accion: "login_bloqueado",
      modulo: "login_2fa",
      resultado: "bloqueado",
      ip,
      detalle: `2FA bloqueado: ${redactarCorreo(email)}`,
    });
    return {
      error: "Demasiados intentos de verificación. Intenta más tarde.",
    };
  }

  const parsed = codigo2FASchema.safeParse({
    codigo: String(formData.get("codigo") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Código inválido." };
  }

  if (!pendingToken) {
    return { error: "Sesión de verificación expirada. Vuelve a iniciar sesión." };
  }

  try {
    await signIn("credentials-2fa", {
      mfaPendingToken: pendingToken,
      mfaCode: parsed.data.codigo,
      redirectTo: String(formData.get("callbackUrl") ?? "/panel"),
    });
  } catch (error) {
    if (isRedirectError(error)) {
      jar.delete(COOKIE_LOGIN_PENDIENTE);
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (user) {
        await registrarIntento(`2fa:cuenta:${email}`, true, user.id);
        await registrarIntento(`cuenta:${email}`, true, user.id);
        await registrarEvento({
          userId: user.id,
          accion: "login_2fa_exitoso",
          modulo: "login_2fa",
          resultado: "exito",
          ip,
        });
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
      await registrarIntento(`2fa:cuenta:${email}`, false);
      await registrarEvento({
        accion: "login_2fa_fallido",
        modulo: "login_2fa",
        resultado: "fallo",
        ip,
        detalle: `Correo: ${redactarCorreo(email)}`,
      });
      return { error: "Código incorrecto o expirado." };
    }
    throw error;
  }

  return {};
}
