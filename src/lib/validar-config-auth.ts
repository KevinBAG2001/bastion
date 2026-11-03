/**
 * Validación de configuración Auth.js al arrancar (B2).
 *
 * Lección: `trustHost: true` permite que Auth.js confíe en el host de la solicitud
 * (útil detrás de proxies en Vercel/docker). Sin AUTH_URL explícita en producción,
 * un atacante podría influir en URLs de callback si el despliegue está mal configurado.
 */

function urlPublicaConfigurada(): string | undefined {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return authUrl;
  const legacy = process.env.NEXTAUTH_URL?.trim();
  if (legacy) return legacy;
  return undefined;
}

export function validarConfigAuthEnProduccion(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const url = urlPublicaConfigurada();
  if (!url) {
    throw new Error(
      "[Bastion] AUTH_URL es obligatorio en producción (trustHost está activo). " +
        "Define la URL pública canónica de la app, p. ej. https://bastion.ejemplo.com",
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      console.warn(
        "[Bastion] ADVERTENCIA: AUTH_URL en producción debería usar HTTPS salvo en pruebas locales.",
      );
    }
  } catch {
    throw new Error(`[Bastion] AUTH_URL no es una URL válida: ${url}`);
  }
}

validarConfigAuthEnProduccion();
