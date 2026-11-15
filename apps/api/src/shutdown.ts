type ClosableServer = {
  close: (callback: (error?: Error) => void) => unknown;
  closeIdleConnections?: () => void;
};

type StoppableWorker = { stop: () => Promise<void> };

export const SHUTDOWN_TIMEOUT_MS = 10_000;

function closeServer(server: ClosableServer) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    // Keep-alive sockets would hold close() open until they time out.
    server.closeIdleConnections?.();
  });
}

/**
 * Stops taking requests, lets the in-flight ones finish, stops the worker,
 * then exits. Exits with 1 when a step fails or the whole takes longer than
 * `timeoutMs`. A second signal while shutting down is ignored.
 */
export function gracefulShutdown(options: {
  server?: ClosableServer;
  worker?: StoppableWorker;
  exit?: (code: number) => void;
  timeoutMs?: number;
}) {
  const exit = options.exit ?? ((code: number) => process.exit(code));
  let started: Promise<void> | undefined;

  return (signal: string) => {
    started ??= (async () => {
      console.log(`${signal} received, shutting down`);
      const timer = setTimeout(() => {
        console.error("Shutdown timed out");
        exit(1);
      }, options.timeoutMs ?? SHUTDOWN_TIMEOUT_MS);
      timer.unref?.();
      try {
        if (options.server) await closeServer(options.server);
        await options.worker?.stop();
        clearTimeout(timer);
        exit(0);
      } catch (error) {
        clearTimeout(timer);
        console.error("Shutdown failed", error);
        exit(1);
      }
    })();
    return started;
  };
}
