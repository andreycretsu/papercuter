import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSupabaseAdmin } from "@/server/supabase-admin";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[Auth] Missing credentials");
          return null;
        }

        try {
          const supabase = getSupabaseAdmin();

          // Get user from database
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, password_hash, role")
            .eq("email", credentials.email)
            .single();

          if (error) {
            console.error("[Auth] Database error:", error);
            return null;
          }

          if (!user) {
            console.error("[Auth] User not found:", credentials.email);
            return null;
          }

          // Hash the provided password using SHA-256
          const encoder = new TextEncoder();
          const data = encoder.encode(credentials.password);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Compare hashed password
          if (passwordHash !== user.password_hash) {
            console.error("[Auth] Invalid password for user:", credentials.email);
            return null;
          }

          console.log("[Auth] Login successful:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0],
            role: user.role || 'editor',
          };
        } catch (error) {
          console.error("[Auth] Unexpected error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role || 'editor';
      }
      console.log("[Auth] JWT callback - token:", { id: token.id, email: token.email, role: token.role });
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
        (session.user as any).role = token.role || 'editor';
      }
      console.log("[Auth] Session callback - session:", session);
      return session;
    },
  },
};

export default NextAuth(authOptions);
