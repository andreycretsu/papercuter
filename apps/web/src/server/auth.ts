import { cookies } from "next/headers";

// Simple password-based authentication
// In production, use a proper auth system like NextAuth.js

const AUTH_PASSWORD = process.env.PAPERCUTS_PASSWORD || "papercuts2024";
const AUTH_COOKIE_NAME = "papercuts_auth";
const AUTH_COOKIE_VALUE = "authenticated";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === AUTH_COOKIE_VALUE;
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function verifyPassword(password: string): boolean {
  return password === AUTH_PASSWORD;
}
