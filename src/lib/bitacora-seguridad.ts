/**
 * Bitácora de eventos de seguridad persistente en PostgreSQL.
 *
 * ¿Qué ataque evita?
 * - Registro insuficiente (CWE-778): sin logs de seguridad, un atacante puede
 *   operar sin ser detectado. La bitácora permite auditoría forense.
 *
 * Reglas:
 * - NUNCA registrar contraseñas, hashes, tokens, cookies ni correos completos.
 * - Registrar solo la acción, el resultado y metadatos no sensibles.
 * - El correo se redacta parcialmente en el detalle (p. ej. "k***@g***.com").
 */

import { prisma } from "@/lib/prisma";

export type AccionSeguridad =
  | "registro"
  | "login_exitoso"
  | "login_fallido"
  | "login_bloqueado"
  | "verificacion_correo"
  | "solicitud_recuperacion"
  | "restablecimiento_contrasena"
  | "cambio_contrasena"
  | "cierre_todas_sesiones"
  | "csrf_rechazado";

export interface DatosBitacora {
  userId?: string;
  accion: AccionSeguridad;
  modulo: string;
  resultado: "exito" | "fallo" | "bloqueado" | "error";
  ip?: string;
  /** No incluir datos sensibles (correo, contraseña, token, hash). */
  detalle?: string;
}

/**
 * Registra un evento de seguridad en la base de datos.
 * Operación fire-and-forget: no bloquea el flujo principal si falla.
 */
export async function registrarEvento(datos: DatosBitacora): Promise<void> {
  try {
    await prisma.eventoSeguridad.create({
      data: {
        userId: datos.userId,
        accion: datos.accion,
        modulo: datos.modulo,
        resultado: datos.resultado,
        ip: datos.ip,
        detalle: datos.detalle,
      },
    });
  } catch (error) {
    // No lanzar: la bitácora no debe romper el flujo de autenticación.
    // En producción, esto iría a un sistema de monitoreo externo.
    console.error("[bitácora-seguridad] Error al registrar evento:", error);
  }
}

/**
 * Redacta parcialmente un correo para registro en bitácora.
 * "kevin@gmail.com" → "k***@g***.com"
 */
export function redactarCorreo(correo: string): string {
  const [local, dominio] = correo.split("@");
  if (!local || !dominio) return "***@***.***";
  const partesDominio = dominio.split(".");
  const dominioRedactado = partesDominio
    .map((p) => (p.length > 0 ? p[0] + "***" : "***"))
    .join(".");
  return `${local[0]}***@${dominioRedactado}`;
}
