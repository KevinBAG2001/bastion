/**
 * Verificación de contraseñas filtradas con Have I Been Pwned (API k-anonymity).
 *
 * ¿Qué ataque evita?
 * - Credential stuffing: un atacante usa listas de contraseñas filtradas para
 *   intentar acceder a cuentas (CWE-521, CWE-307).
 *
 * ¿Cómo funciona k-anonymity?
 * 1. Se calcula el SHA-1 de la contraseña en el servidor (no se envía la contraseña).
 * 2. Se envía solo los primeros 5 caracteres del hash a la API de HIBP.
 * 3. La API devuelve todos los sufijos que coinciden.
 * 4. Se busca localmente si el sufijo completo aparece en la lista.
 *
 * La contraseña nunca sale del servidor; HIBP solo ve un prefijo de 5 chars
 * del SHA-1, lo que no permite reconstruir la contraseña ni el hash completo.
 *
 * Tolerante a fallos de red: si la API no responde, se permite el registro
 * con una advertencia en la bitácora.
 */

import { createHash } from "node:crypto";

const HIBP_API = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3_000;

/**
 * Verifica si una contraseña aparece en filtraciones conocidas.
 * @returns Objeto con `filtrada` (true si está comprometida) y `conteo` (veces filtrada).
 *          Si hay error de red, devuelve `filtrada: false` y `error: true`.
 */
export async function verificarContrasenFiltrada(contrasena: string): Promise<{
  filtrada: boolean;
  conteo: number;
  error: boolean;
}> {
  try {
    const sha1 = createHash("sha1").update(contrasena).digest("hex").toUpperCase();
    const prefijo = sha1.slice(0, 5);
    const sufijo = sha1.slice(5);

    const respuesta = await fetch(`${HIBP_API}${prefijo}`, {
      headers: {
        "User-Agent": "Bastion-Plataforma-Educativa",
        "Add-Padding": "true",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      return { filtrada: false, conteo: 0, error: true };
    }

    const texto = await respuesta.text();
    const lineas = texto.split("\n");

    for (const linea of lineas) {
      const [hashSufijo, conteoStr] = linea.split(":");
      if (hashSufijo?.trim() === sufijo) {
        const conteo = parseInt(conteoStr?.trim() ?? "0", 10);
        return { filtrada: true, conteo, error: false };
      }
    }

    return { filtrada: false, conteo: 0, error: false };
  } catch {
    // Tolerante a fallos de red: no bloqueamos el registro si HIBP no responde.
    return { filtrada: false, conteo: 0, error: true };
  }
}
