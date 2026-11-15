"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SuperJSON from "superjson";

import { type AppRouter } from "@repo/api/types";
import { messagesFor } from "@repo/i18n/messages";
import { useLocale } from "~/components/locale-provider";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = (onUnhandledMutationError: (error: unknown) => void) => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient(onUnhandledMutationError);

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const locale = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const queryClient = getQueryClient(() => {
    toast.error(messagesFor(localeRef.current).webUi.errorState.fallback);
  });
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const lastLocale = useRef(locale);
  useEffect(() => {
    if (lastLocale.current !== locale) {
      lastLocale.current = locale;
      queryClient.clear();
    }
  }, [locale, queryClient]);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          // The API rejects a batch of more than 20 calls.
          maxItems: 20,
          headers: async () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            headers.set("accept-language", localeRef.current);
            const token = await getTokenRef.current();
            if (token) headers.set("authorization", `Bearer ${token}`);
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3001}`;
}
