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
          return null;
        }

        const supabase = getSupabaseAdmin();

        // Get user from database
        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, password_hash")
          .eq("email", credentials.email)
          .single();

        if (error || !user) {
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
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.email.split('@')[0],
        };
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
      }
      return token;
    },
    async session({ session, token }) {
      return session;
    },
  },
};

export default NextAuth(authOptions);
