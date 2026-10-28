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

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

/**
 * Reads an absolute URL from the environment and validates it.
 * Vercel stores env values literally, so a copied `.env` line such as
 * `http://localhost:3000 # comment` would otherwise crash Better Auth
 * with "Invalid base URL" on the first request.
 */
function readBaseURL(name) {
  const raw = process.env[name];

  if (!raw) {
    return undefined;
  }

  let url;

  try {
    url = new URL(raw.trim());
  } catch {
    console.warn(
      `[auth] Ignoring ${name}: expected an absolute http(s) URL. ` +
        "Check for inline comments, quotes, or extra whitespace copied from .env."
    );
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    console.warn(
      `[auth] Ignoring ${name}: URL must start with http:// or https://.`
    );
    return undefined;
  }

  if (process.env.VERCEL && isLoopbackHost(url.hostname)) {
    console.warn(
      `[auth] Ignoring ${name}: it points to localhost on Vercel. ` +
        "Falling back to the Vercel deployment URL."
    );
    return undefined;
  }

  return url.origin;
}

function resolveBaseURL() {
  const configured =
    readBaseURL("BETTER_AUTH_URL") ||
    readBaseURL("NEXT_PUBLIC_BETTER_AUTH_URL");

  if (configured) {
    return configured;
  }

  // Vercel provides these automatically. The production host keeps OAuth
  // callbacks and cookies stable across preview deployments.
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  return "http://localhost:3000";
}

function resolveTrustedOrigins(baseURL) {
  const origins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
  ]);

  try {
    origins.add(new URL(baseURL).origin);
  } catch {
    // baseURL is always validated above, so this is unreachable in practice.
  }

  for (const host of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    if (host) {
      origins.add(`https://${host}`);
    }
  }

  return [...origins];
}

function createAuth() {
  const client = new MongoClient(getDatabaseUri(), {
    // Fail fast with an actionable error instead of hanging when Atlas
    // network access (IP allowlist) is not configured for the deployment.
    serverSelectionTimeoutMS: 10000,
  });

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

  if (!process.env.BETTER_AUTH_SECRET) {
    console.warn(
      "[auth] BETTER_AUTH_SECRET is not set. Better Auth rejects requests in production without it."
    );
  }

  const baseURL = resolveBaseURL();

  const auth = betterAuth({
    database: mongodbAdapter(database, {
      client,
    }),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: resolveTrustedOrigins(baseURL),

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
