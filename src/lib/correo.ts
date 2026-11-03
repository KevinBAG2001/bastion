import type { TipoToken } from "@prisma/client";

/** Tokens emitidos en e2e (BASTION_E2E=1) para pruebas sin leer la consola del servidor. */
const tokensE2e = new Map<string, Partial<Record<TipoToken, string>>>();

function registrarTokenE2e(para: string, tipo: TipoToken, token: string): void {
  if (process.env.BASTION_E2E !== "1") return;
  const key = para.toLowerCase();
  tokensE2e.set(key, { ...tokensE2e.get(key), [tipo]: token });
}

/** Solo disponible con BASTION_E2E=1 (endpoint test-utils). */
export function obtenerTokenE2e(para: string, tipo: TipoToken): string | null {
  if (process.env.BASTION_E2E !== "1") return null;
  return tokensE2e.get(para.toLowerCase())?.[tipo] ?? null;
}

/**
 * Adaptador de correo electrónico intercambiable.
 *
 * Bastion no usa un servicio de correo externo (costo cero).
 * Los enlaces se imprimen en la consola del servidor.
 *
 * Para producción: implementar un adaptador con Resend, SES u otro servicio
 * y cambiar la función `enviarCorreo` por la implementación real.
 *
 * ¿Qué ataque evita?
 * - Phishing por correos no autenticados: al usar un adaptador controlado,
 *   se centraliza el envío y se puede agregar DKIM/SPF en el futuro (CWE-345).
 */

export interface CorreoOpciones {
  para: string;
  asunto: string;
  textoPlano: string;
  html?: string;
}

export interface AdaptadorCorreo {
  enviar(opciones: CorreoOpciones): Promise<void>;
}

/**
 * Adaptador de consola: imprime el correo en stdout del servidor.
 * Seguro para desarrollo y aprendizaje; no envía nada por red.
 */
const adaptadorConsola: AdaptadorCorreo = {
  async enviar(opciones: CorreoOpciones): Promise<void> {
    advertirConsolaEnProduccion();
    const cuerpo =
      process.env.NODE_ENV === "production"
        ? enmascararSecretosEnTexto(opciones.textoPlano)
        : opciones.textoPlano;

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║          📧 CORREO (adaptador de consola)           ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║ Para:   ${opciones.para}`);
    console.log(`║ Asunto: ${opciones.asunto}`);
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(cuerpo);
    console.log("╚══════════════════════════════════════════════════════╝\n");
  },
};

/**
 * Enmascara tokens en URLs antes de loguear (A4, CWE-532).
 * Los logs centralizados (Docker, CloudWatch, etc.) suelen retenerse años;
 * un enlace con ?token= filtrado equivale a filtrar la credencial.
 */
export function enmascararSecretosEnTexto(texto: string): string {
  return texto.replace(/([?&]token=)[^&\s]+/gi, "$1[REDACTADO]");
}

let advertenciaConsolaProduccionEmitida = false;

function advertirConsolaEnProduccion(): void {
  if (process.env.NODE_ENV !== "production" || advertenciaConsolaProduccionEmitida) {
    return;
  }
  advertenciaConsolaProduccionEmitida = true;
  console.error(
    "\n[Bastion] ADVERTENCIA (A4 / CWE-532): el adaptador de correo por consola está activo " +
      "en NODE_ENV=production. Los tokens en enlaces se enmascaran en el log, pero sustituye " +
      "este adaptador por un servicio de correo real antes de un despliegue público.\n",
  );
}

/** Adaptador activo. Cambiar por otro en producción. */
let adaptadorActivo: AdaptadorCorreo = adaptadorConsola;

/** Permite cambiar el adaptador de correo en tiempo de ejecución (para tests o producción). */
export function configurarAdaptadorCorreo(adaptador: AdaptadorCorreo): void {
  adaptadorActivo = adaptador;
}

/** Envía un correo usando el adaptador configurado. */
export async function enviarCorreo(opciones: CorreoOpciones): Promise<void> {
  await adaptadorActivo.enviar(opciones);
}

/**
 * Envía correo de verificación de cuenta.
 * El enlace contiene un token de un solo uso.
 */
export async function enviarCorreoVerificacion(
  para: string,
  token: string,
): Promise<void> {
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const enlace = `${baseUrl}/verificar-correo?token=${token}`;

  registrarTokenE2e(para, "VERIFICACION_CORREO", token);

  await enviarCorreo({
    para,
    asunto: "Verifica tu cuenta en Bastion",
    textoPlano: [
      "¡Bienvenido/a a Bastion!",
      "",
      "Verifica tu correo electrónico haciendo clic en el siguiente enlace:",
      enlace,
      "",
      "Este enlace expira en 24 horas y solo puede usarse una vez.",
      "",
      "Si no creaste esta cuenta, ignora este mensaje.",
    ].join("\n"),
  });
}

/**
 * Envía correo de recuperación de contraseña.
 */
export async function enviarCorreoRecuperacion(
  para: string,
  token: string,
): Promise<void> {
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const enlace = `${baseUrl}/restablecer-contrasena?token=${token}`;

  registrarTokenE2e(para, "RECUPERACION_CONTRASENA", token);

  await enviarCorreo({
    para,
    asunto: "Recupera tu contraseña en Bastion",
    textoPlano: [
      "Recibimos una solicitud para restablecer tu contraseña en Bastion.",
      "",
      "Usa el siguiente enlace para crear una nueva contraseña:",
      enlace,
      "",
      "Este enlace expira en 30 minutos y solo puede usarse una vez.",
      "",
      "Si no solicitaste este cambio, ignora este mensaje.",
      "Tu contraseña actual seguirá funcionando.",
    ].join("\n"),
  });
}
