import { CABECERA_SECRETO_E2E, ENV_SECRETO_E2E } from "../../src/lib/test-utils-e2e";

/** Cabeceras extra para GET a test-utils (secreto E2E en CI con build de producción). */
export function cabecerasTestUtils(): Record<string, string> {
  const secreto = process.env[ENV_SECRETO_E2E];
  if (secreto) {
    return { [CABECERA_SECRETO_E2E]: secreto };
  }
  return {};
}
