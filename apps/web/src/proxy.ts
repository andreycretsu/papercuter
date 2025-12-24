import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Custom middleware logic can go here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - signup (signup page)
     * - forgot-password (forgot password page)
     * - reset-password (reset password page)
     * - papercuts (papercut detail pages - public for OG scrapers)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password|papercuts).*)",
  ],
};
