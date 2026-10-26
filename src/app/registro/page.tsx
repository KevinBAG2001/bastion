import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold">Únete a Bastion</h1>
      <p className="mt-2 text-sm text-muted">
        Crea tu cuenta gratuita y comienza tu ruta en ciberseguridad.
      </p>
      <div className="mt-8 rounded-2xl border border-card-border bg-card/60 p-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/iniciar-sesion" className="text-accent-soft hover:text-accent">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
