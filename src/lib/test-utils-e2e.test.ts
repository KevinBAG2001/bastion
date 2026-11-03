import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CABECERA_SECRETO_E2E,
  ENV_SECRETO_E2E,
  testUtilsE2ePermitido,
} from "./test-utils-e2e";

describe("test-utils-e2e — acceso en producción (M6)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deniega sin BASTION_E2E", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = new Request("http://localhost/api/auth/test-utils");
    expect(testUtilsE2ePermitido(req)).toBe(false);
  });

  it("permite en desarrollo solo con BASTION_E2E=1", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BASTION_E2E", "1");
    const req = new Request("http://localhost/api/auth/test-utils");
    expect(testUtilsE2ePermitido(req)).toBe(true);
  });

  it("deniega en producción con flag pero sin secreto", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BASTION_E2E", "1");
    const req = new Request("http://localhost/api/auth/test-utils");
    expect(testUtilsE2ePermitido(req)).toBe(false);
  });

  it("deniega en producción con secreto en env pero sin cabecera", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BASTION_E2E", "1");
    vi.stubEnv(ENV_SECRETO_E2E, "secreto-ci-solo-en-github-actions");
    const req = new Request("http://localhost/api/auth/test-utils");
    expect(testUtilsE2ePermitido(req)).toBe(false);
  });

  it("permite en producción con flag, secreto y cabecera correcta", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BASTION_E2E", "1");
    vi.stubEnv(ENV_SECRETO_E2E, "secreto-ci-solo-en-github-actions");
    const req = new Request("http://localhost/api/auth/test-utils", {
      headers: { [CABECERA_SECRETO_E2E]: "secreto-ci-solo-en-github-actions" },
    });
    expect(testUtilsE2ePermitido(req)).toBe(true);
  });

  it("deniega en producción si la cabecera no coincide", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BASTION_E2E", "1");
    vi.stubEnv(ENV_SECRETO_E2E, "secreto-ci-solo-en-github-actions");
    const req = new Request("http://localhost/api/auth/test-utils", {
      headers: { [CABECERA_SECRETO_E2E]: "otro-valor" },
    });
    expect(testUtilsE2ePermitido(req)).toBe(false);
  });
});
