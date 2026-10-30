import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .email("Correo electrónico inválido.")
    .max(255),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres.")
    .max(128)
    .regex(/[A-Za-z]/, "Incluye al menos una letra.")
    .regex(/[0-9]/, "Incluye al menos un número.")
    .regex(/[^A-Za-z0-9]/, "Incluye al menos un carácter especial."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

/** Esquema para solicitar recuperación de contraseña. */
export const recuperarContrasenaSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido.").max(255),
});

/** Esquema para restablecer la contraseña con un token. */
export const restablecerContrasenaSchema = z.object({
  token: z.string().min(1, "Token requerido."),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres.")
    .max(128)
    .regex(/[A-Za-z]/, "Incluye al menos una letra.")
    .regex(/[0-9]/, "Incluye al menos un número.")
    .regex(/[^A-Za-z0-9]/, "Incluye al menos un carácter especial."),
});

export const quizSubmitSchema = z.object({
  quizId: z.string().cuid(),
  answers: z.record(z.string().cuid(), z.string().cuid()),
});
