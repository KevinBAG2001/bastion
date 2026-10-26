"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function loginWithCredentials(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const limited =
    process.env.BASTION_DISABLE_RATE_LIMIT === "1"
      ? { success: true, retryAfterMs: 0 }
      : rateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
  if (!limited.success) {
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

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: String(formData.get("callbackUrl") ?? "/panel"),
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }
    throw error;
  }
}
