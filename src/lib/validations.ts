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
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128)
    .regex(/[A-Za-z]/, "Incluye al menos una letra.")
    .regex(/[0-9]/, "Incluye al menos un número."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const quizSubmitSchema = z.object({
  quizId: z.string().cuid(),
  answers: z.record(z.string().cuid(), z.string().cuid()),
});
