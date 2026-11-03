/**
 * Pruebas de formato y entropía de códigos de respaldo (M1).
 */

import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  bytesABase32,
  esFormatoCodigoRespaldo,
  evaluarCodigoRespaldo,
} from "./codigos-respaldo-2fa";

describe("codigos-respaldo-2fa", () => {
  it("genera base32 con al menos 80 bits (16 caracteres)", () => {
    const encoded = bytesABase32(randomBytes(10)).slice(0, 16);
    expect(encoded).toHaveLength(16);
    expect(encoded).toMatch(/^[A-Z2-7]+$/);
  });

  it("acepta formato legado hex y nuevo base32 agrupado", () => {
    expect(esFormatoCodigoRespaldo("a1b2-c3d4")).toBe(true);
    expect(esFormatoCodigoRespaldo("abcd-efgh-ijkl-mnop")).toBe(true);
    expect(esFormatoCodigoRespaldo("invalido")).toBe(false);
  });

  it("normaliza espacios al evaluar", () => {
    const r = evaluarCodigoRespaldo(" abcd-efgh-ijkl-mnop ");
    expect(r.valido).toBe(true);
    expect(r.normalizado).toBe("abcd-efgh-ijkl-mnop");
  });
});
