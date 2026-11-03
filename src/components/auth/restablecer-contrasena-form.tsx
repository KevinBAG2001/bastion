"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RestablecerContrasenaForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));

    const res = await fetch("/api/auth/restablecer-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar la contraseña.");
      return;
    }

    router.push("/iniciar-sesion?restablecido=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted">
          Mínimo 10 caracteres, con letras, números y un carácter especial.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
