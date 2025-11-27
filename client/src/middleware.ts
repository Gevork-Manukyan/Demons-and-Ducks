// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = Boolean(token);
  const pathname = request.nextUrl.pathname;
  const isTryingToAccessProtectedRoute = pathname.startsWith("/app");

  // User logged in and trying to access protected route
  if (isTryingToAccessProtectedRoute && isLoggedIn) {
    return NextResponse.next();
  }

  // User NOT logged in and trying to access protected route
  if (isTryingToAccessProtectedRoute && !isLoggedIn) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // User logged in and trying to access public route
  if (!isTryingToAccessProtectedRoute && isLoggedIn) {
    if (pathname.includes("/login") || pathname.includes("/register")) {
      const url = new URL("/app/lobby", request.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // User NOT logged in and trying to access public route
  if (!isTryingToAccessProtectedRoute && !isLoggedIn) {
    return NextResponse.next();
  }

  // Default: Deny access
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
