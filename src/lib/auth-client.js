import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL:
        typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
              process.env.BETTER_AUTH_URL ||
              (process.env.VERCEL_URL
                  ? `https://${process.env.VERCEL_URL}`
                  : process.env.NODE_ENV === "production"
                  ? "https://bazardor-project-assijment-7-2rwk.vercel.app"
                  : "http://localhost:3000"),
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
} = authClient;