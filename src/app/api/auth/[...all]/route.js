import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

let handlers;

function getHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }

  return handlers;
}

export function GET(request) {
  return getHandlers().GET(request);
}

export function POST(request) {
  return getHandlers().POST(request);
}
