import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/token";

// Optimistic check only: pages and actions still verify the admin against
// the database through requireAdmin().
export default async function proxy(req: NextRequest) {
  const signedIn = Boolean(await verifyToken(req.cookies.get(SESSION_COOKIE)?.value));
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", req.nextUrl)) : NextResponse.next();
  }
  if (!signedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // The terminal and its tap endpoint are used without an administrator.
  matcher: ["/((?!api/tap|terminal|_next/static|_next/image|favicon.ico).*)"],
};
