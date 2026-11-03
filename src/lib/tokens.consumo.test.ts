/**
 * Prueba de doble consumo atómico de tokens (A5).
 * Requiere PostgreSQL (DATABASE_URL), como en CI.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { consumirTokenAtomico, generarToken } from "@/lib/tokens";

const tieneDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!tieneDb)("tokens — consumo atómico", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `token-atomico-${Date.now()}@ejemplo.test`,
        name: "Prueba Token",
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.tokenVerificacion.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it("solo una de dos consumiciones paralelas del mismo token tiene éxito", async () => {
    const token = await generarToken(userId, "LOGIN_PENDIENTE_2FA");

    const [a, b] = await Promise.all([
      consumirTokenAtomico(token, "LOGIN_PENDIENTE_2FA"),
      consumirTokenAtomico(token, "LOGIN_PENDIENTE_2FA"),
    ]);

    const exitos = [a, b].filter((id) => id !== null);
    expect(exitos).toHaveLength(1);
    expect(exitos[0]).toBe(userId);
  });
});
