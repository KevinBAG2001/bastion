/**
 * Wrapper de Argon2id usando hash-wasm (WASM puro, sin compilación nativa).
 *
 * ¿Qué ataque evita?
 * - Fuerza bruta offline sobre hashes robados (CWE-916).
 * - Argon2id es resistente a ataques con GPU y ASIC gracias a su consumo de memoria.
 *
 * Parámetros OWASP 2024 para Argon2id:
 *   memorySize=19456 KiB (~19 MiB), iterations=2, parallelism=1, hashLength=32
 *   Salt aleatorio de 16 bytes por contraseña.
 *
 * Se usa hash-wasm porque no requiere compilación nativa ni entrada en allowBuilds
 * de pnpm-workspace.yaml, a diferencia del paquete `argon2` que depende de node-gyp.
 */

import { argon2id, argon2Verify } from "hash-wasm";
import { randomBytes } from "node:crypto";

/** Parámetros de hashing alineados con la recomendación OWASP para Argon2id. */
const ARGON2_CONFIG = {
  /** Iteraciones (costo de tiempo). */
  iterations: 2,
  /** Memoria en KiB (~19 MiB). Resiste ataques con GPU/ASIC. */
  memorySize: 19_456,
  /** Hilos lógicos. 1 para entornos serverless y Node single-threaded. */
  parallelism: 1,
  /** Longitud del hash resultante en bytes. */
  hashLength: 32,
  /** Longitud del salt en bytes (128 bits). */
  saltLength: 16,
} as const;

/**
 * Genera el hash Argon2id de una contraseña.
 * Devuelve la cadena codificada estándar ($argon2id$v=19$...).
 */
export async function hashContrasena(contrasena: string): Promise<string> {
  const salt = randomBytes(ARGON2_CONFIG.saltLength);
  return argon2id({
    password: contrasena,
    salt,
    iterations: ARGON2_CONFIG.iterations,
    memorySize: ARGON2_CONFIG.memorySize,
    parallelism: ARGON2_CONFIG.parallelism,
    hashLength: ARGON2_CONFIG.hashLength,
    outputType: "encoded",
  });
}

/**
 * Verifica una contraseña contra un hash Argon2id codificado.
 * Tiempo constante internamente (hash-wasm usa comparación segura).
 */
export async function verificarContrasena(
  contrasena: string,
  hashCodificado: string,
): Promise<boolean> {
  return argon2Verify({ password: contrasena, hash: hashCodificado });
}
