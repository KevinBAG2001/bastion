"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SeguridadCuenta({
  emailVerifiedAtIso,
}: {
  emailVerifiedAtIso: string | null;
}) {
  const emailVerifiedAt = emailVerifiedAtIso ? new Date(emailVerifiedAtIso) : null;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function cerrarTodasLasSesiones() {
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/auth/cerrar-todas-sesiones", { method: "POST" });
    const data = (await res.json()) as { error?: string; message?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo cerrar las sesiones.");
      return;
    }

    setMessage(data.message ?? "Sesiones cerradas.");
    await signOut({ callbackUrl: "/iniciar-sesion" });
  }

  return (
    <section className="mt-10 rounded-2xl border border-card-border bg-card/60 p-6">
      <h2 className="text-xl font-semibold">Seguridad de la cuenta</h2>
      <p className="mt-2 text-sm text-muted">
        Gestiona la verificación de tu correo y las sesiones activas en otros dispositivos.
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 rounded-lg bg-card/40 px-4 py-2">
          <dt className="text-muted">Correo verificado</dt>
          <dd className={emailVerifiedAt ? "text-success" : "text-warning"}>
            {emailVerifiedAt
              ? emailVerifiedAt.toLocaleDateString("es-MX")
              : "Pendiente — revisa tu bandeja de entrada"}
          </dd>
        </div>
      </dl>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-green-200" role="status">
          {message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void cerrarTodasLasSesiones()}>
          {loading ? "Cerrando sesiones…" : "Cerrar sesión en todos los dispositivos"}
        </Button>
        <p className="text-xs text-muted">
          Invalida las sesiones abiertas en otros navegadores. También cerrarás sesión aquí.
        </p>
      </div>
    </section>
  );
}
