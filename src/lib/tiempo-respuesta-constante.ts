/**
 * Utilidad para reducir fugas por tiempo de respuesta (CWE-208).
 *
 * Lección: aunque el mensaje sea idéntico, un atacante puede medir cuánto tarda
 * la respuesta y deducir si la cuenta existe. `asegurarTiempoMinimo` garantiza
 * un piso de latencia; combínalo con trabajo equivalente (p. ej. hash Argon2id).
 */

/** Espera lo necesario para que hayan transcurrido al menos `minimoMs` desde `desdeMs`. */
export async function asegurarTiempoMinimo(
  desdeMs: number,
  minimoMs: number,
): Promise<void> {
  const restante = minimoMs - (Date.now() - desdeMs);
  if (restante > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, restante);
    });
  }
}
