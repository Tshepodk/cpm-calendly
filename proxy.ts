import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/event-types") ||
    req.nextUrl.pathname.startsWith("/availability") ||
    req.nextUrl.pathname.startsWith("/bookings") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (!isAdminRoute) return NextResponse.next();
  if (req.auth?.user) return NextResponse.next();

  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/event-types/:path*",
    "/availability/:path*",
    "/bookings/:path*",
    "/settings/:path*",
  ],
};
