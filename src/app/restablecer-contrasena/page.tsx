import type { Metadata } from "next";
import Link from "next/link";
import { RestablecerContrasenaForm } from "@/components/auth/restablecer-contrasena-form";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-muted">Elige una contraseña segura que no hayas usado en otros sitios.</p>
      <div className="mt-8 rounded-2xl border border-card-border bg-card/60 p-6">
        {token ? (
          <RestablecerContrasenaForm token={token} />
        ) : (
          <div className="space-y-4 text-sm">
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200" role="alert">
              El enlace no es válido. Solicita uno nuevo desde recuperación de contraseña.
            </p>
            <Link href="/recuperar-contrasena" className="text-accent-soft hover:text-accent">
              Solicitar nuevo enlace
            </Link>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/iniciar-sesion" className="text-accent-soft hover:text-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
