/**
 * Server Actions de autenticación.
 *
 * Protecciones:
 * - Límite de intentos por IP y por cuenta en PostgreSQL (CWE-307).
 * - Segunda fase 2FA con límite por userId del token pendiente, no por email del cliente (A1).
 * - Token LOGIN_PENDIENTE_2FA solo en cookie HttpOnly (M3).
 * - Mensajes genéricos que no revelan si el correo existe (CWE-203).
 * - Bitácora de eventos de seguridad (CWE-778).
 * - CSRF verificado automáticamente por Next.js en Server Actions.
 */

"use server";

import { cookies, headers } from "next/headers";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { codigo2FASchema, loginSchema } from "@/lib/validations";
import { verificarLimite, registrarIntento } from "@/lib/limite-intentos";
import { registrarEvento, redactarCorreo } from "@/lib/bitacora-seguridad";
import { verificarCredenciales } from "@/lib/verificar-credenciales";
import { generarToken, validarTokenSinConsumir } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { ipClienteDesdeEncabezados } from "@/lib/ip-cliente";

const COOKIE_LOGIN_PENDIENTE = "bastion_login_pendiente_2fa";
const MAX_AGE_PENDIENTE_SEG = 5 * 60;

export type EstadoLogin =
  | { error?: string }
  | { requires2FA: true; email: string };

export async function loginWithCredentials(
  _prev: EstadoLogin | undefined,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const ip = ipClienteDesdeEncabezados(await headers());

  const limiteIp = await verificarLimite(`ip:${ip}`);
  if (!limiteIp.permitido) {
    await registrarEvento({
      accion: "login_bloqueado",
      modulo: "login",
      resultado: "bloqueado",
      ip,
      detalle: `IP bloqueada, ${limiteIp.intentosFallidos} intentos`,
    });
    return {
      error: "Demasiados intentos de inicio de sesión. Intenta más tarde.",
    };
  }

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
    await registrarIntento(`ip:${ip}`, false);
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
      await registrarIntento(`ip:${ip}`, true, usuario.id);
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
      await registrarIntento(`ip:${ip}`, false);
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
  const jar = await cookies();
  const pendingToken = jar.get(COOKIE_LOGIN_PENDIENTE)?.value ?? "";
  const ip = ipClienteDesdeEncabezados(await headers());

  if (!pendingToken) {
    return { error: "Sesión de verificación expirada. Vuelve a iniciar sesión." };
  }

  const userId = await validarTokenSinConsumir(pendingToken, "LOGIN_PENDIENTE_2FA");
  if (!userId) {
    jar.delete(COOKIE_LOGIN_PENDIENTE);
    return { error: "Sesión de verificación expirada. Vuelve a iniciar sesión." };
  }

  const limiteIp2fa = await verificarLimite(`2fa:ip:${ip}`);
  if (!limiteIp2fa.permitido) {
    await registrarEvento({
      userId,
      accion: "login_bloqueado",
      modulo: "login_2fa",
      resultado: "bloqueado",
      ip,
      detalle: "2FA bloqueado por IP",
    });
    return {
      error: "Demasiados intentos de verificación. Intenta más tarde.",
    };
  }

  const limite2fa = await verificarLimite(`2fa:cuenta:${userId}`);
  if (!limite2fa.permitido) {
    await registrarEvento({
      userId,
      accion: "login_bloqueado",
      modulo: "login_2fa",
      resultado: "bloqueado",
      ip,
      detalle: "2FA bloqueado por intentos",
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
        where: { id: userId },
        select: { email: true },
      });
      if (user) {
        await registrarIntento(`2fa:cuenta:${userId}`, true, userId);
        await registrarIntento(`2fa:ip:${ip}`, true, userId);
        await registrarIntento(`cuenta:${user.email}`, true, userId);
        await registrarIntento(`ip:${ip}`, true, userId);
        await registrarEvento({
          userId,
          accion: "login_2fa_exitoso",
          modulo: "login_2fa",
          resultado: "exito",
          ip,
        });
        await registrarEvento({
          userId,
          accion: "login_exitoso",
          modulo: "login",
          resultado: "exito",
          ip,
          detalle: `Correo: ${redactarCorreo(user.email)}`,
        });
      }
      throw error;
    }
    if (error instanceof AuthError) {
      await registrarIntento(`2fa:cuenta:${userId}`, false, userId);
      await registrarIntento(`2fa:ip:${ip}`, false, userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      await registrarEvento({
        userId,
        accion: "login_2fa_fallido",
        modulo: "login_2fa",
        resultado: "fallo",
        ip,
        detalle: user ? `Correo: ${redactarCorreo(user.email)}` : undefined,
      });
      return { error: "Código incorrecto o expirado." };
    }
    throw error;
  }

  return {};
}
