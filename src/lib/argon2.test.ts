/**
 * Pruebas del módulo de hashing Argon2id.
 *
 * Verifica:
 * - Hash genera cadena en formato Argon2id estándar.
 * - Verificación exitosa con contraseña correcta.
 * - Verificación fallida con contraseña incorrecta.
 * - Cada hash es único (salt aleatorio).
 */

import { describe, it, expect } from "vitest";
import { hashContrasena, verificarContrasena } from "./argon2";

describe("argon2 — hashing Argon2id", () => {
  it("genera un hash en formato $argon2id$", async () => {
    const hash = await hashContrasena("Contr@s3ña!Segura");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifica contraseña correcta", async () => {
    const contrasena = "M1Contr@señ@!2024";
    const hash = await hashContrasena(contrasena);
    const valido = await verificarContrasena(contrasena, hash);
    expect(valido).toBe(true);
  });

  it("rechaza contraseña incorrecta", async () => {
    const hash = await hashContrasena("Contr@señ@C0rrecta!");
    const valido = await verificarContrasena("ContraseñaIncorrecta!", hash);
    expect(valido).toBe(false);
  });

  it("genera hashes únicos para la misma contraseña (salt aleatorio)", async () => {
    const contrasena = "M1sm@Contr@seña!";
    const hash1 = await hashContrasena(contrasena);
    const hash2 = await hashContrasena(contrasena);
    expect(hash1).not.toBe(hash2);
    // Pero ambos verifican correctamente
    expect(await verificarContrasena(contrasena, hash1)).toBe(true);
    expect(await verificarContrasena(contrasena, hash2)).toBe(true);
  });
});
