import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@repo/api/root";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { contextFor } from "../context";

export const TRPC_BODY_LIMIT_BYTES = 4 * 1024 * 1024;

export function trpcRoute(options: Parameters<typeof contextFor>[0]) {
  const createContext = contextFor(options);
  return new Hono().use(
    "/api/trpc/*",
    bodyLimit({
      maxSize: TRPC_BODY_LIMIT_BYTES,
      onError: (c) => c.text("Payload too large", 413),
    }),
    trpcServer({
      endpoint: "/api/trpc",
      router: appRouter,
      createContext: (_opts, c) => createContext(c.req.raw),
    }),
  );
}
