import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registrado?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/panel";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold">Bienvenido de nuevo</h1>
      <p className="mt-2 text-sm text-muted">Ingresa a tu panel de aprendizaje en Bastion.</p>
      <div className="mt-8 rounded-2xl border border-card-border bg-card/60 p-6">
        <LoginForm callbackUrl={callbackUrl} registered={params.registrado === "1"} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent-soft hover:text-accent">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
