import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedPrefixes = ["/panel", "/cursos", "/perfil"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !req.auth) {
    const login = new URL("/iniciar-sesion", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (
    req.auth &&
    (pathname === "/iniciar-sesion" || pathname === "/registro")
  ) {
    return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/panel/:path*",
    "/cursos/:path*",
    "/perfil/:path*",
    "/iniciar-sesion",
    "/registro",
  ],
};
