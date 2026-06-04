import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasTeam = !!request.cookies.get("st_team");
  const hasAdmin = !!request.cookies.get("st_admin");

  if (pathname.startsWith("/team/") && !hasTeam) {
    return NextResponse.redirect(new URL("/team", request.url));
  }

  if (pathname.startsWith("/ouder/") && !hasAdmin) {
    return NextResponse.redirect(new URL("/ouder", request.url));
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!hasAdmin) {
      return NextResponse.redirect(new URL("/ouder", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/team/:path*", "/ouder/:path*", "/admin/:path*"],
};
