/**
 * Pruebas del módulo de tokens seguros.
 *
 * Verifica:
 * - hashToken genera un hash SHA-256 hex de 64 caracteres.
 * - hashToken es determinista (mismo input → mismo output).
 * - Tokens diferentes generan hashes diferentes.
 */

import { describe, it, expect } from "vitest";
import { hashToken } from "./tokens";

describe("tokens — generación y hash", () => {
  it("genera hash SHA-256 de 64 caracteres hex", () => {
    const hash = hashToken("mi-token-de-prueba");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("es determinista", () => {
    const token = "token-fijo-para-prueba";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("tokens diferentes producen hashes diferentes", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
