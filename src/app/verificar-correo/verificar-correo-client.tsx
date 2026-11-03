"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function VerificarCorreoClient({ token }: { token: string }) {
  const router = useRouter();
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const procesado = useRef(false);

  useEffect(() => {
    if (procesado.current) return;
    procesado.current = true;

    window.history.replaceState(null, "", "/verificar-correo");

    void (async () => {
      try {
        const respuesta = await fetch("/api/auth/verificar-correo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const datos = (await respuesta.json()) as { redirect?: string; error?: string };
        if (!respuesta.ok) {
          setMensajeError(datos.error ?? "No se pudo verificar el correo.");
          return;
        }
        router.replace(datos.redirect ?? "/iniciar-sesion?verificado=true");
      } catch {
        setMensajeError("Error de red al verificar el correo.");
      }
    })();
  }, [router, token]);

  if (mensajeError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Verificación de correo</h1>
        <p className="mt-4 text-muted">{mensajeError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Verificando tu correo…</h1>
      <p className="mt-4 text-muted">Un momento, estamos confirmando tu cuenta.</p>
    </div>
  );
}
