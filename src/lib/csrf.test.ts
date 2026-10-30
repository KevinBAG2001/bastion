/**
 * Pruebas del módulo CSRF.
 *
 * Verifica:
 * - Origin válido es aceptado.
 * - Origin de otro dominio es rechazado.
 * - Sin Origin ni Referer es rechazado.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { verificarOrigenCSRF } from "./csrf";

describe("csrf — verificación de Origin", () => {
  beforeEach(() => {
    process.env.AUTH_URL = "http://localhost:3000";
  });

  it("acepta Origin legítimo", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(verificarOrigenCSRF(req)).toBe(true);
  });

  it("rechaza Origin de otro dominio", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { origin: "https://evil.com" },
    });
    expect(verificarOrigenCSRF(req)).toBe(false);
  });

  it("rechaza solicitud sin Origin ni Referer", () => {
    const req = new Request("http://localhost:3000/api/test");
    expect(verificarOrigenCSRF(req)).toBe(false);
  });

  it("acepta Referer legítimo cuando no hay Origin", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { referer: "http://localhost:3000/registro" },
    });
    expect(verificarOrigenCSRF(req)).toBe(true);
  });
});
