-- AlterEnum
ALTER TYPE "TipoToken" ADD VALUE 'LOGIN_PENDIENTE_2FA';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpSecretCifrado" TEXT,
ADD COLUMN     "totpSecretoPendienteCifrado" TEXT,
ADD COLUMN     "totpUltimoPasoUsado" INTEGER;

-- CreateTable
CREATE TABLE "CodigoRespaldo2FA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoRespaldo2FA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodigoRespaldo2FA_userId_usedAt_idx" ON "CodigoRespaldo2FA"("userId", "usedAt");

-- AddForeignKey
ALTER TABLE "CodigoRespaldo2FA" ADD CONSTRAINT "CodigoRespaldo2FA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
