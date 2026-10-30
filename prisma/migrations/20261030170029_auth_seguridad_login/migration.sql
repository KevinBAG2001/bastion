-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('VERIFICACION_CORREO', 'RECUPERACION_CONTRASENA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenVerificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "id" TEXT NOT NULL,
    "llave" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoSeguridad" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "ip" TEXT,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoSeguridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenVerificacion_tokenHash_idx" ON "TokenVerificacion"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenVerificacion_userId_tipo_idx" ON "TokenVerificacion"("userId", "tipo");

-- CreateIndex
CREATE INDEX "IntentoLogin_llave_createdAt_idx" ON "IntentoLogin"("llave", "createdAt");

-- CreateIndex
CREATE INDEX "EventoSeguridad_userId_createdAt_idx" ON "EventoSeguridad"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EventoSeguridad_accion_createdAt_idx" ON "EventoSeguridad"("accion", "createdAt");

-- AddForeignKey
ALTER TABLE "TokenVerificacion" ADD CONSTRAINT "TokenVerificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoLogin" ADD CONSTRAINT "IntentoLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoSeguridad" ADD CONSTRAINT "EventoSeguridad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
