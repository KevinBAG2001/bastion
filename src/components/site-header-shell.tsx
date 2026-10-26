import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { AuthNav } from "@/components/auth-nav";

export function SiteHeaderShell() {
  return (
    <header className="border-b border-card-border/80 bg-background/70 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/40"
            aria-hidden
          >
            B
          </span>
          <span>Bastion</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Principal">
          <AuthNav
            guest={
              <>
                <ButtonLink href="/iniciar-sesion" variant="ghost">
                  Iniciar sesión
                </ButtonLink>
                <ButtonLink href="/registro">Crear cuenta</ButtonLink>
              </>
            }
          />
        </nav>
      </div>
    </header>
  );
}
