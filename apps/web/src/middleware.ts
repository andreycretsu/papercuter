import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  // Redirect authenticated users away from login page
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.url));
  }

  // Redirect unauthenticated users to login page (except API routes)
  if (!isLoggedIn && !isLoginPage && !req.nextUrl.pathname.startsWith("/api")) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
