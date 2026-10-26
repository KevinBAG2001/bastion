import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

const variants = {
  primary: "bg-accent text-white hover:bg-accent-soft shadow-lg shadow-indigo-500/20",
  secondary:
    "bg-card border border-card-border text-foreground hover:border-accent/50",
  ghost: "text-muted hover:text-foreground hover:bg-white/5",
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
