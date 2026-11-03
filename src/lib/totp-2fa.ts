/**
 * TOTP (RFC 6238) para verificación en dos pasos.
 *
 * ¿Qué ataque evita?
 * - Robo de contraseña sin segundo factor (CWE-308): aunque filtren la contraseña,
 *   el atacante necesita el dispositivo autenticador o un código de respaldo.
 *
 * Usamos otplib (mantenido, RFC 6238) y QR generado en local con qrcode (sin APIs externas).
 */

import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";
import { cifrarSecreto, descifrarSecreto } from "@/lib/cifrado-secreto";

export const PERIODO_TOTP_SEG = 30;
export const NOMBRE_EMISOR_TOTP = "Bastion";

/** Genera un nuevo secreto base32 para vincular una app autenticadora. */
export function generarSecretoTotp(): string {
  return generateSecret();
}

/** URI otpauth:// para apps autenticadoras (Google Authenticator, Aegis, etc.). */
export function uriTotp(correo: string, secretoPlano: string): string {
  return generateURI({
    issuer: NOMBRE_EMISOR_TOTP,
    label: correo,
    secret: secretoPlano,
  });
}

/** Imagen PNG en data URL para mostrar el QR sin servicios externos. */
export async function generarQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
  });
}

export function cifrarSecretoTotp(secretoPlano: string): string {
  return cifrarSecreto(secretoPlano);
}

export function descifrarSecretoTotp(secretoCifrado: string): string {
  return descifrarSecreto(secretoCifrado);
}

export interface ResultadoVerificacionTotp {
  valido: boolean;
  /** Paso de tiempo TOTP (epoch/periodo) usado para detectar reutilización. */
  pasoUsado?: number;
}

/**
 * Verifica un código TOTP de 6 dígitos con tolerancia ±1 ventana (reloj desincronizado).
 */
export function verificarCodigoTotp(
  secretoPlano: string,
  codigo: string,
): ResultadoVerificacionTotp {
  const token = codigo.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { valido: false };
  }

  const resultado = verifySync({
    secret: secretoPlano,
    token,
    epochTolerance: 1,
  });

  if (!resultado.valid) {
    return { valido: false };
  }

  const epoch = Math.floor(Date.now() / 1000);
  const pasoActual = Math.floor(epoch / PERIODO_TOTP_SEG);
  const pasoUsado = pasoActual + (resultado.delta ?? 0);

  return { valido: true, pasoUsado };
}
