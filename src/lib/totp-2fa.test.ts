/**
 * Pruebas TOTP (RFC 6238) con otplib.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { generateSync } from "otplib";
import {
  generarSecretoTotp,
  uriTotp,
  verificarCodigoTotp,
  cifrarSecretoTotp,
  descifrarSecretoTotp,
} from "./totp-2fa";

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
});

describe("totp-2fa", () => {
  it("genera URI otpauth válida", () => {
    const secreto = generarSecretoTotp();
    const uri = uriTotp("usuario@ejemplo.test", secreto);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Bastion");
  });

  it("verifica un código TOTP generado con el mismo secreto", () => {
    const secreto = generarSecretoTotp();
    const token = generateSync({ secret: secreto });
    const resultado = verificarCodigoTotp(secreto, token);
    expect(resultado.valido).toBe(true);
    expect(resultado.pasoUsado).toBeTypeOf("number");
  });

  it("rechaza códigos con formato inválido", () => {
    const resultado = verificarCodigoTotp("ABCDE", "12345");
    expect(resultado.valido).toBe(false);
  });

  it("cifra secretos para almacenamiento en BD", () => {
    const secreto = generarSecretoTotp();
    const cifrado = cifrarSecretoTotp(secreto);
    expect(descifrarSecretoTotp(cifrado)).toBe(secreto);
  });
});
