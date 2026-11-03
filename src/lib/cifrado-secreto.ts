/**
 * Cifrado simétrico AES-256-GCM para secretos TOTP en reposo.
 *
 * ¿Qué ataque evita?
 * - Exposición del secreto TOTP si alguien obtiene un volcado de la BD (CWE-311).
 *   El secreto solo es útil con la clave maestra del entorno (TOTP_ENCRYPTION_KEY).
 *
 * Formato almacenado: base64(iv):base64(tag):base64(ciphertext)
 * La clave debe ser exactamente 32 bytes aleatorios en base64 (ver .env.example).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const LONGITUD_IV = 12;

function obtenerClaveMaestra(): Buffer {
  const valor = process.env.TOTP_ENCRYPTION_KEY;
  if (!valor) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY no está configurada. Genera una con: openssl rand -base64 32",
    );
  }
  const clave = Buffer.from(valor, "base64");
  if (clave.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY debe decodificar a exactamente 32 bytes.");
  }
  return clave;
}

/** Cifra texto UTF-8 y devuelve una cadena autocontenida para PostgreSQL. */
export function cifrarSecreto(textoPlano: string): string {
  const clave = obtenerClaveMaestra();
  const iv = randomBytes(LONGITUD_IV);
  const cifrador = createCipheriv(ALGORITMO, clave, iv);
  const cifrado = Buffer.concat([
    cifrador.update(textoPlano, "utf8"),
    cifrador.final(),
  ]);
  const tag = cifrador.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${cifrado.toString("base64")}`;
}

/** Descifra una cadena producida por `cifrarSecreto`. */
export function descifrarSecreto(payload: string): string {
  const partes = payload.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de secreto cifrado inválido.");
  }
  const [ivB64, tagB64, datosB64] = partes;
  const clave = obtenerClaveMaestra();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const datos = Buffer.from(datosB64, "base64");
  const descifrador = createDecipheriv(ALGORITMO, clave, iv);
  descifrador.setAuthTag(tag);
  const plano = Buffer.concat([descifrador.update(datos), descifrador.final()]);
  return plano.toString("utf8");
}
