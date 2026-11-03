"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RecuperarContrasenaForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));

    const res = await fetch("/api/auth/recuperar-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar la solicitud.");
      return;
    }

    setMessage(data.message ?? "Si el correo está registrado, recibirás un enlace.");
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
      {message && (
        <p
          className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-blue-200"
          role="status"
        >
          {message}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted">
          Te enviaremos un enlace si el correo está registrado. Por seguridad, el mensaje es el mismo
          en todos los casos.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
