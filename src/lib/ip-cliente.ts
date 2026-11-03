/**
 * Resolución segura de la IP del cliente para rate limiting y bitácora.
 *
 * ¿Qué ataque evita?
 * - Spoofing de X-Forwarded-For (CWE-290): un cliente puede enviar un encabezado
 *   falso y evadir límites por IP o enmarcar a otra víctima en la bitácora.
 *
 * Lección: solo debes confiar en X-Forwarded-For / X-Real-IP si hay un proxy
 * de confianza delante de la app que *sobrescribe* o *añade* esos encabezados.
 * En local (sin proxy) usamos una llave fija `directo` para que un XFF inventado
 * no cambie el bucket de rate limit.
 *
 * Configuración: `BASTION_TRUSTED_PROXY` = número de saltos de proxy de confianza
 * (p. ej. `1` detrás de un único nginx). Ver `.env.example`.
 */

/** Llave de rate limit cuando no hay proxy de confianza (no usar encabezados falsificables). */
export const IP_CLIENTE_SIN_PROXY = "directo";

/**
 * Número de proxies de confianza delante de Node, o `null` si no hay ninguno.
 * Valores inválidos se tratan como sin proxy (modo seguro).
 */
export function resolverSaltosProxyConfiables(): number | null {
  const raw = process.env.BASTION_TRUSTED_PROXY?.trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "false") {
    return null;
  }
  const saltos = Number.parseInt(raw, 10);
  if (!Number.isFinite(saltos) || saltos < 1) {
    return null;
  }
  return saltos;
}

/**
 * Extrae la IP del cliente desde una cadena X-Forwarded-For válida.
 * Con N proxies de confianza, la IP del cliente está en la posición
 * `length - N - 1` (0 = izquierda), porque los proxies de confianza añaden
 * entradas a la derecha.
 */
export function extraerIpDesdeXForwardedFor(
  xForwardedFor: string,
  saltosProxy: number,
): string {
  const partes = xForwardedFor
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) {
    return IP_CLIENTE_SIN_PROXY;
  }
  const indice = partes.length - saltosProxy - 1;
  if (indice < 0 || indice >= partes.length) {
    return partes[0] ?? IP_CLIENTE_SIN_PROXY;
  }
  return partes[indice] ?? IP_CLIENTE_SIN_PROXY;
}

/**
 * Obtiene la IP del cliente a partir de encabezados HTTP (Route Handlers o Server Actions).
 */
export function ipClienteDesdeEncabezados(headers: Headers): string {
  const saltos = resolverSaltosProxyConfiables();
  if (saltos === null) {
    return IP_CLIENTE_SIN_PROXY;
  }

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    return extraerIpDesdeXForwardedFor(xff, saltos);
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return IP_CLIENTE_SIN_PROXY;
}

/** Atajo para Route Handlers con `Request`. */
export function ipClienteDesdeRequest(request: Request): string {
  return ipClienteDesdeEncabezados(request.headers);
}
