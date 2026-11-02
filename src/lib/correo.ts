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
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║          📧 CORREO (adaptador de consola)           ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║ Para:   ${opciones.para}`);
    console.log(`║ Asunto: ${opciones.asunto}`);
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(opciones.textoPlano);
    console.log("╚══════════════════════════════════════════════════════╝\n");
  },
};

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
  const enlace = `${baseUrl}/api/auth/verificar-correo?token=${token}`;

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
