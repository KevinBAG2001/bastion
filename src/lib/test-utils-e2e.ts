/**
 * Control de acceso al endpoint /api/auth/test-utils (M6).
 *
 * Lección: un flag de entorno (BASTION_E2E=1) no basta en builds de producción:
 * el código del endpoint sigue en el bundle y alguien podría activar el flag por error.
 * En NODE_ENV=production exigimos además un secreto compartido solo en CI, enviado por
 * cabecera — nunca un valor fijo en el repositorio.
 */

import { timingSafeEqual } from "node:crypto";

export const CABECERA_SECRETO_E2E = "x-bastion-e2e-secret";

/** Nombre de la variable de entorno del servidor y de Playwright en CI. */
export const ENV_SECRETO_E2E = "BASTION_E2E_SECRET";

function compararSecretoConstante(esperado: string, recibido: string): boolean {
  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(recibido, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Indica si test-utils debe responder (no 404).
 * - Sin BASTION_E2E=1 → siempre denegado.
 * - Desarrollo/test (NODE_ENV !== production) → permitido con solo el flag.
 * - Producción → flag + secreto en env + cabecera coincidente (p. ej. CI con pnpm start).
 */
export function testUtilsE2ePermitido(request: Request): boolean {
  if (process.env.BASTION_E2E !== "1") {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secreto = process.env[ENV_SECRETO_E2E];
  if (!secreto || secreto.length < 16) {
    return false;
  }

  const cabecera = request.headers.get(CABECERA_SECRETO_E2E);
  if (!cabecera) {
    return false;
  }

  return compararSecretoConstante(secreto, cabecera);
}
