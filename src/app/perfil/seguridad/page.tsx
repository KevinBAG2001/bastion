import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

export const metadata: Metadata = {
  title: "Seguridad de la cuenta",
};

export default async function SeguridadPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user!.id },
    select: { totpEnabledAt: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/perfil" className="text-sm text-accent-soft hover:text-accent">
        ← Volver al perfil
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Seguridad</h1>
      <p className="mt-2 text-muted">
        Configura la verificación en dos pasos para proteger tu cuenta de Bastion.
      </p>
      <div className="mt-8">
        <TwoFactorSetup totpActivo={user.totpEnabledAt !== null} />
      </div>
    </div>
  );
}
