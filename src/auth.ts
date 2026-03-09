import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function getAllowedEmails(): string[] {
  const raw = process.env.APP_ALLOWED_EMAILS || process.env.APP_LOGIN_EMAIL || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        const allowedEmails = getAllowedEmails();
        const allowedPassword = process.env.APP_LOGIN_PASSWORD || "";

        if (!email || !password || allowedEmails.length === 0 || !allowedPassword) {
          return null;
        }

        if (!allowedEmails.includes(email) || password !== allowedPassword) {
          return null;
        }

        return {
          id: email,
          email,
          name: email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
