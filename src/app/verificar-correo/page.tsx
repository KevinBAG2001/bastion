import { Suspense } from "react";
import { VerificarCorreoClient } from "./verificar-correo-client";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerificarCorreoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Verificación de correo</h1>
        <p className="mt-4 text-muted">Falta el token de verificación en el enlace.</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">Verificando tu correo…</h1>
        </div>
      }
    >
      <VerificarCorreoClient token={token} />
    </Suspense>
  );
}
