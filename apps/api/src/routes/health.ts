import { Hono } from "hono";

type HealthDb = { execute: (query: string) => PromiseLike<unknown> };

export function healthRoute(options: { db: HealthDb }) {
  return new Hono().get("/healthz", async (c) => {
    try {
      await options.db.execute("select 1");
    } catch (error) {
      console.error("Health check: database unreachable", error);
      return c.text("database unreachable", 503);
    }
    return c.text("ok");
  });
}
