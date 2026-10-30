/**
 * Pruebas del módulo de bitácora de seguridad.
 *
 * Verifica:
 * - redactarCorreo oculta correctamente el correo.
 */

import { describe, it, expect } from "vitest";
import { redactarCorreo } from "./bitacora-seguridad";

describe("bitacora-seguridad — redacción de correos", () => {
  it("redacta correo estándar", () => {
    const redactado = redactarCorreo("kevin@gmail.com");
    expect(redactado).toBe("k***@g***.c***");
  });

  it("redacta correo con dominio largo", () => {
    const redactado = redactarCorreo("usuario@empresa.com.mx");
    expect(redactado).toBe("u***@e***.c***.m***");
  });

  it("maneja correo inválido sin @", () => {
    const redactado = redactarCorreo("sinArroba");
    expect(redactado).toBe("***@***.***");
  });
});
