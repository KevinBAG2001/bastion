"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  totpActivo: boolean;
};

export function TwoFactorSetup({ totpActivo: inicialActivo }: Props) {
  const [totpActivo, setTotpActivo] = useState(inicialActivo);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [claveManual, setClaveManual] = useState<string | null>(null);
  const [codigosRespaldo, setCodigosRespaldo] = useState<string[] | null>(null);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
  const [passwordDesactivar, setPasswordDesactivar] = useState("");
  const [codigoDesactivar, setCodigoDesactivar] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarActivacion() {
    setCargando(true);
    setError(null);
    setMensaje(null);
    setCodigosRespaldo(null);
    try {
      const res = await fetch("/api/auth/2fa/iniciar-activacion", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar la activación.");
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setClaveManual(data.claveManual);
      setMensaje(
        "Escanea el código QR con tu app autenticadora (Google Authenticator, Aegis, etc.) o ingresa la clave manual. Luego confirma con un código de 6 dígitos.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function confirmarActivacion(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/confirmar-activacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoConfirmacion }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar.");
        return;
      }
      setTotpActivo(true);
      setQrDataUrl(null);
      setClaveManual(null);
      setCodigosRespaldo(data.codigosRespaldo ?? null);
      setMensaje(
        "Verificación en dos pasos activada. Guarda estos códigos de respaldo en un lugar seguro; solo se muestran una vez.",
      );
      setCodigoConfirmacion("");
    } finally {
      setCargando(false);
    }
  }

  async function desactivar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/desactivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordDesactivar,
          codigo: codigoDesactivar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo desactivar.");
        return;
      }
      setTotpActivo(false);
      setCodigosRespaldo(null);
      setMensaje("Verificación en dos pasos desactivada. Deberás iniciar sesión de nuevo.");
      setPasswordDesactivar("");
      setCodigoDesactivar("");
    } finally {
      setCargando(false);
    }
  }

  async function regenerarRespaldo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/regenerar-respaldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoConfirmacion }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudieron regenerar los códigos.");
        return;
      }
      setCodigosRespaldo(data.codigosRespaldo ?? null);
      setMensaje("Nuevos códigos de respaldo generados. Los anteriores ya no funcionan.");
      setCodigoConfirmacion("");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card/60 p-6">
      <h2 className="text-lg font-semibold">Verificación en dos pasos (TOTP)</h2>
      <p className="mt-2 text-sm text-muted">
        Protege tu cuenta con un código temporal de seis dígitos además de tu contraseña.
      </p>

      {mensaje && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-blue-200">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      {codigosRespaldo && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">Códigos de respaldo (guárdalos ahora)</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
            {codigosRespaldo.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {!totpActivo && !qrDataUrl && (
        <Button type="button" className="mt-6" onClick={iniciarActivacion} disabled={cargando}>
          {cargando ? "Generando…" : "Activar verificación en dos pasos"}
        </Button>
      )}

      {!totpActivo && qrDataUrl && (
        <div className="mt-6 space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL generada en local */}
          <img src={qrDataUrl} alt="Código QR para app autenticadora" className="mx-auto rounded-lg bg-white p-2" width={220} height={220} />
          {claveManual && (
            <p className="break-all text-center font-mono text-sm text-muted">
              Clave manual: {claveManual}
            </p>
          )}
          <form onSubmit={confirmarActivacion} className="space-y-3">
            <label htmlFor="codigo-activar" className="block text-sm font-medium">
              Código de confirmación (6 dígitos)
            </label>
            <input
              id="codigo-activar"
              value={codigoConfirmacion}
              onChange={(e) => setCodigoConfirmacion(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
            />
            <Button type="submit" disabled={cargando}>
              {cargando ? "Confirmando…" : "Confirmar activación"}
            </Button>
          </form>
        </div>
      )}

      {totpActivo && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-success">Estado: activa</p>
          <form onSubmit={regenerarRespaldo} className="space-y-3 border-t border-card-border pt-4">
            <h3 className="text-sm font-medium">Regenerar códigos de respaldo</h3>
            <input
              value={codigoConfirmacion}
              onChange={(e) => setCodigoConfirmacion(e.target.value)}
              placeholder="Código TOTP actual"
              inputMode="numeric"
              required
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
            />
            <Button type="submit" variant="secondary" disabled={cargando}>
              Regenerar códigos
            </Button>
          </form>
          <form onSubmit={desactivar} className="space-y-3 border-t border-card-border pt-4">
            <h3 className="text-sm font-medium">Desactivar 2FA</h3>
            <input
              type="password"
              value={passwordDesactivar}
              onChange={(e) => setPasswordDesactivar(e.target.value)}
              placeholder="Contraseña"
              required
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
            />
            <input
              value={codigoDesactivar}
              onChange={(e) => setCodigoDesactivar(e.target.value)}
              placeholder="Código TOTP"
              inputMode="numeric"
              required
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
            />
            <Button type="submit" disabled={cargando} className="bg-red-600 hover:bg-red-700">
              Desactivar
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
