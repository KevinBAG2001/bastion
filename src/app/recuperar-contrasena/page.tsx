import type { Metadata } from "next";
import Link from "next/link";
import { RecuperarContrasenaForm } from "@/components/auth/recuperar-contrasena-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecuperarContrasenaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-muted">
        Indica el correo de tu cuenta. Si está registrado, recibirás un enlace para crear una nueva
        contraseña.
      </p>
      <div className="mt-8 rounded-2xl border border-card-border bg-card/60 p-6">
        <RecuperarContrasenaForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/iniciar-sesion" className="text-accent-soft hover:text-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
