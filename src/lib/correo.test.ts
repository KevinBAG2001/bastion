import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enmascararSecretosEnTexto, enviarCorreo } from "./correo";

describe("correo — enmascaramiento en logs (A4)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("enmascara parámetro token en URLs", () => {
    const texto =
      "Verifica: https://app.test/verificar-correo?token=secreto-largo&foo=bar";
    expect(enmascararSecretosEnTexto(texto)).toContain("token=[REDACTADO]");
    expect(enmascararSecretosEnTexto(texto)).not.toContain("secreto-largo");
  });

  it("adaptador de consola no imprime el token en claro en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await enviarCorreo({
      para: "a@test.com",
      asunto: "Test",
      textoPlano: "Link https://x.test/v?token=abc123",
    });

    const llamadas = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
    expect(llamadas.some((l) => l.includes("abc123"))).toBe(false);
    expect(llamadas.some((l) => l.includes("[REDACTADO]"))).toBe(true);
  });
});
