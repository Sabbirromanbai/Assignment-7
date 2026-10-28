import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

function getDatabaseUri() {
  const uri =
    process.env.BETTER_AUTH_MONGODB_URI ||
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "BETTER_AUTH_MONGODB_URI or MONGODB_URI is not defined in the environment"
    );
  }

  return uri;
}

function createAuth() {
  const client = new MongoClient(getDatabaseUri());
  const database = client.db("bazardor");

  const socialProviders = {};

  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  ) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET
  ) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    (process.env.NODE_ENV === "production"
      ? "https://bazardor-project-assijment-7-2rwk.vercel.app"
      : "http://localhost:3000");

  const auth = betterAuth({
    database: mongodbAdapter(database, {
      client,
    }),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://bazardor-project-assijment-7-2rwk.vercel.app",
      "https://*.vercel.app",
    ],

    emailAndPassword: {
      enabled: true,
    },

    socialProviders,
  });

  return { auth, database };
}

// Initialize lazily so `next build` can collect route configuration
// without requiring runtime env vars (e.g. the MongoDB URI).
// `globalThis` keeps a single instance across dev HMR reloads.
function getInstance() {
  if (!globalThis.__bazardorAuthInstance) {
    globalThis.__bazardorAuthInstance = createAuth();
  }

  return globalThis.__bazardorAuthInstance;
}

export function getAuth() {
  return getInstance().auth;
}

export function getDatabase() {
  return getInstance().database;
}
