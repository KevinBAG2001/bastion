"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginForm({
  callbackUrl,
  registered,
}: {
  callbackUrl: string;
  registered?: boolean;
}) {
  const [state, action, pending] = useActionState(loginWithCredentials, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {registered && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-green-200">
          Cuenta creada. Inicia sesión para continuar.
        </p>
      )}
      {state?.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {state.error}
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
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
