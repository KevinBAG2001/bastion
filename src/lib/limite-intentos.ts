/**
 * Límite de intentos de login guardado en PostgreSQL vía Prisma.
 *
 * ¿Qué ataque evita?
 * - Fuerza bruta online contra cuentas (CWE-307).
 * - Credential stuffing masivo desde una IP (CWE-799).
 *
 * Bloqueo temporal progresivo:
 * - Primeros 5 fallos: sin bloqueo.
 * - 5–9 fallos: bloqueo de 1 minuto.
 * - 10–14 fallos: bloqueo de 5 minutos.
 * - 15–19 fallos: bloqueo de 15 minutos.
 * - 20+ fallos: bloqueo de 60 minutos.
 *
 * Se guarda en PostgreSQL (no Redis) porque Bastion es un monolito de aprendizaje
 * con una sola instancia. Si se escala horizontalmente, migrar a Redis/Upstash.
 *
 * Los mensajes genéricos no revelan si el correo existe (CWE-203: enumeración de usuarios).
 */

import { prisma } from "@/lib/prisma";

/** Umbrales de bloqueo progresivo: [fallos mínimos, bloqueo en ms]. */
const UMBRALES_BLOQUEO: [number, number][] = [
  [20, 60 * 60 * 1000],   // 60 min
  [15, 15 * 60 * 1000],   // 15 min
  [10, 5 * 60 * 1000],    // 5 min
  [5, 1 * 60 * 1000],     // 1 min
];

/** Ventana máxima para contar intentos (60 minutos). */
const VENTANA_MS = 60 * 60 * 1000;

export interface ResultadoLimite {
  permitido: boolean;
  bloqueoMs: number;
  intentosFallidos: number;
}

/**
 * Verifica si una llave (IP o cuenta) está bloqueada por intentos fallidos.
 * No registra el intento; usar `registrarIntento` después de verificar credenciales.
 */
export async function verificarLimite(llave: string): Promise<ResultadoLimite> {
  if (process.env.BASTION_DISABLE_RATE_LIMIT === "1") {
    return { permitido: true, bloqueoMs: 0, intentosFallidos: 0 };
  }

  const desde = new Date(Date.now() - VENTANA_MS);

  const intentosFallidos = await prisma.intentoLogin.count({
    where: {
      llave,
      exito: false,
      createdAt: { gte: desde },
    },
  });

  for (const [umbral, bloqueoMs] of UMBRALES_BLOQUEO) {
    if (intentosFallidos >= umbral) {
      // Verificar si el bloqueo aún está vigente desde el último fallo
      const ultimoFallo = await prisma.intentoLogin.findFirst({
        where: { llave, exito: false, createdAt: { gte: desde } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (ultimoFallo) {
        const tiempoDesdeUltimoFallo = Date.now() - ultimoFallo.createdAt.getTime();
        if (tiempoDesdeUltimoFallo < bloqueoMs) {
          const restante = bloqueoMs - tiempoDesdeUltimoFallo;
          return { permitido: false, bloqueoMs: restante, intentosFallidos };
        }
      }
    }
  }

  return { permitido: true, bloqueoMs: 0, intentosFallidos };
}

/**
 * Registra un intento de login (exitoso o fallido).
 */
export async function registrarIntento(
  llave: string,
  exito: boolean,
  userId?: string,
): Promise<void> {
  await prisma.intentoLogin.create({
    data: { llave, exito, userId },
  });
}

/**
 * Limpieza periódica de intentos antiguos (más de 24 horas).
 * Ejecutar desde un cron o tarea programada (evolución).
 */
export async function limpiarIntentosAntiguos(): Promise<number> {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const resultado = await prisma.intentoLogin.deleteMany({
    where: { createdAt: { lt: hace24h } },
  });
  return resultado.count;
}
