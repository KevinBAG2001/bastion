/**
 * Pruebas de cifrado AES-GCM para secretos TOTP en reposo.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { cifrarSecreto, descifrarSecreto } from "./cifrado-secreto";

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("cifrado-secreto", () => {
  it("cifra y descifra un secreto TOTP", () => {
    const plano = "JBSWY3DPEHPK3PXP";
    const cifrado = cifrarSecreto(plano);
    expect(cifrado).not.toContain(plano);
    expect(descifrarSecreto(cifrado)).toBe(plano);
  });

  it("produce ciphertext distinto en cada cifrado (IV aleatorio)", () => {
    const a = cifrarSecreto("secreto");
    const b = cifrarSecreto("secreto");
    expect(a).not.toBe(b);
  });
});
