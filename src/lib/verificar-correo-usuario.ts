import { prisma } from "@/lib/prisma";
import { registrarEvento } from "@/lib/bitacora-seguridad";
import { verificarToken } from "@/lib/tokens";

/** Consume el token de verificación de correo y marca la cuenta como verificada. */
export async function verificarCorreoConToken(token: string): Promise<"ok" | "invalido"> {
  const userId = await verificarToken(token, "VERIFICACION_CORREO");
  if (!userId) {
    return "invalido";
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await registrarEvento({
    userId,
    accion: "verificacion_correo",
    modulo: "verificacion",
    resultado: "exito",
  });

  return "ok";
}
