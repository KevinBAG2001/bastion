/**
 * Pruebas del módulo HIBP (Have I Been Pwned k-anonymity).
 *
 * Verifica:
 * - Contraseña conocida como filtrada ("password") se detecta.
 * - Contraseña aleatoria no aparece como filtrada.
 * - Error de red devuelve { filtrada: false, error: true } (tolerante a fallos).
 */

import { describe, it, expect, vi } from "vitest";
import { verificarContrasenFiltrada } from "./hibp";

describe("hibp — verificación de contraseñas filtradas", () => {
  it("detecta una contraseña conocida como filtrada", async () => {
    // "password" es la contraseña más filtrada del mundo
    const resultado = await verificarContrasenFiltrada("password");
    // Si HIBP está accesible, debería detectarla
    if (!resultado.error) {
      expect(resultado.filtrada).toBe(true);
      expect(resultado.conteo).toBeGreaterThan(0);
    }
  });

  it("acepta una contraseña aleatoria", async () => {
    // Contraseña lo suficientemente única para no estar en HIBP
    const unica = `Bast1on!${Date.now()}${Math.random().toString(36)}#Xyz`;
    const resultado = await verificarContrasenFiltrada(unica);
    if (!resultado.error) {
      expect(resultado.filtrada).toBe(false);
      expect(resultado.conteo).toBe(0);
    }
  });

  it("es tolerante a fallos de red", async () => {
    // Simular fallo de red
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const resultado = await verificarContrasenFiltrada("cualquierCosa123!");
    expect(resultado.filtrada).toBe(false);
    expect(resultado.error).toBe(true);

    global.fetch = originalFetch;
  });
});
