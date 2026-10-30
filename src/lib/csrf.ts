/**
 * Protección CSRF para Route Handlers.
 *
 * ¿Qué ataque evita?
 * - Cross-Site Request Forgery (CWE-352): un sitio malicioso hace que el navegador
 *   del usuario envíe solicitudes autenticadas sin su consentimiento.
 *
 * Next.js verifica automáticamente el encabezado Origin en Server Actions.
 * Auth.js gestiona su propio token CSRF en /api/auth/*.
 * Esta función protege Route Handlers personalizados (registro, recuperación, etc.).
 *
 * Verifica que el encabezado Origin o Referer coincida con el host de la aplicación.
 */

const ORIGENES_PERMITIDOS = new Set<string>();

function obtenerOrigenesPermitidos(): Set<string> {
  if (ORIGENES_PERMITIDOS.size === 0) {
    const urls = [
      process.env.AUTH_URL,
      process.env.NEXTAUTH_URL,
      "http://localhost:3000",
    ];
    for (const url of urls) {
      if (url) {
        try {
          ORIGENES_PERMITIDOS.add(new URL(url).origin);
        } catch {
          // URL inválida; ignorar
        }
      }
    }
  }
  return ORIGENES_PERMITIDOS;
}

/**
 * Verifica el encabezado Origin/Referer de una solicitud HTTP.
 * @returns true si la solicitud es legítima (mismo origen), false si es sospechosa.
 */
export function verificarOrigenCSRF(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const permitidos = obtenerOrigenesPermitidos();

  // Si hay Origin, verificar directamente
  if (origin) {
    return permitidos.has(origin);
  }

  // Fallback a Referer (navegadores antiguos o redirecciones)
  if (referer) {
    try {
      return permitidos.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Sin Origin ni Referer: rechazar por precaución en métodos mutantes
  return false;
}
