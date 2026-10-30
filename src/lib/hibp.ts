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
 * NOTA IMPORTANTE SOBRE SHA-1:
 * SHA-1 es OBLIGATORIO aquí porque la API de HIBP (https://haveibeenpwned.com/API/v3)
 * exige un prefijo SHA-1 como protocolo de consulta k-anonymity. NO se usa SHA-1
 * para almacenar contraseñas (para eso usamos Argon2id en src/lib/argon2.ts).
 * El SHA-1 es efímero: se calcula, se extrae el prefijo, se descarta.
 * No se guarda el hash SHA-1 completo en ningún lugar.
 *
 * Tolerante a fallos de red: si la API no responde, se permite el registro
 * con una advertencia en la bitácora.
 */

const HIBP_API = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3_000;

/**
 * Prefijo y sufijo SHA-1 en hex (protocolo k-anonymity de HIBP).
 * Usamos Web Crypto (crypto.subtle) en lugar de node:crypto.createHash para
 * consultar la API; el digest no se persiste (ver nota sobre SHA-1 arriba).
 */
async function prefijoSufijoHibp(contrasena: string): Promise<{
  prefijo: string;
  sufijo: string;
}> {
  const bytes = new TextEncoder().encode(contrasena);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return { prefijo: hex.slice(0, 5), sufijo: hex.slice(5) };
}

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
    const { prefijo, sufijo } = await prefijoSufijoHibp(contrasena);

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
