"use client";

import { useActionState } from "react";
import {
  loginWithCredentials,
  loginWithSecondFactor,
  type EstadoLogin,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";

function esEstado2FA(state: EstadoLogin | undefined): state is {
  requires2FA: true;
  pendingToken: string;
  email: string;
} {
  return Boolean(state && "requires2FA" in state && state.requires2FA);
}

export function LoginForm({
  callbackUrl,
  registered,
  verified,
}: {
  callbackUrl: string;
  registered?: boolean;
  verified?: boolean;
}) {
  const [state, action, pending] = useActionState(loginWithCredentials, undefined);
  const [state2fa, action2fa, pending2fa] = useActionState(
    loginWithSecondFactor,
    undefined,
  );

  const fase2FA = esEstado2FA(state);

  if (fase2FA) {
    return (
      <form action={action2fa} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="pendingToken" value={state.pendingToken} />
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-blue-200">
          Verificación en dos pasos activada. Ingresa el código de tu app autenticadora o un
          código de respaldo.
        </p>
        {state2fa?.error && (
          <p
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {state2fa.error}
          </p>
        )}
        <div>
          <label htmlFor="codigo-2fa" className="mb-1 block text-sm font-medium">
            Código de verificación
          </label>
          <input
            id="codigo-2fa"
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            placeholder="000000 o xxxx-xxxx"
            className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending2fa}>
          {pending2fa ? "Verificando…" : "Confirmar e ingresar"}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {registered && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-blue-200">
          Cuenta creada. Revisa tu correo para verificar tu cuenta antes de iniciar sesión.
        </p>
      )}
      {verified && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-green-200">
          Correo verificado correctamente. Ya puedes iniciar sesión.
        </p>
      )}
      {state && "error" in state && state.error && (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
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
