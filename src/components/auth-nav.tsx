"use client";

import { signOut, useSession } from "next-auth/react";
import { Button, ButtonLink } from "@/components/ui/button";

export function AuthNav({ guest }: { guest: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-muted">…</span>;
  }

  if (!session?.user) {
    return guest;
  }

  return (
    <>
      <ButtonLink href="/panel" variant="ghost" className="hidden sm:inline-flex">
        Panel
      </ButtonLink>
      <ButtonLink href="/cursos" variant="ghost">
        Cursos
      </ButtonLink>
      <ButtonLink href="/perfil" variant="secondary">
        Perfil
      </ButtonLink>
      <Button type="button" variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
        Salir
      </Button>
    </>
  );
}
