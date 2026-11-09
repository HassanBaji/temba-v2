import { useAuth } from "@clerk/expo";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { useEffect, useRef, useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@repo/api/types";
import { messagesFor } from "@repo/i18n/messages";
import { useLocale } from "../i18n/locale-provider";
import { apiOrigin } from "../lib/api-origin-runtime";
import { errorMessage, type ErrorCopy } from "../lib/error-message";

export const api = createTRPCReact<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Screens show `error.message`, so the copy for a failed request is set here
 * once: a network failure or an internal error reads as the shared copy, and
 * a coded error keeps the server's message.
 */
function userFacingErrors(copy: () => ErrorCopy): TRPCLink<AppRouter> {
  return () =>
    ({ next, op }) =>
      observable((observer) =>
        next(op).subscribe({
          next: (value) => observer.next(value),
          error: (error) => {
            error.message = errorMessage(
              error,
              copy(),
              onlineManager.isOnline(),
            );
            observer.error(error);
          },
          complete: () => observer.complete(),
        }),
      );
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30 * 1000 } },
      }),
  );
  const { getToken, userId } = useAuth();
  const lastUserId = useRef(userId);
  const lastLocale = useRef<string | null>(null);
  useEffect(() => {
    if (lastUserId.current !== userId) {
      lastUserId.current = userId;
      queryClient.clear();
    }
  }, [queryClient, userId]);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const locale = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  useEffect(() => {
    if (lastLocale.current !== locale) {
      lastLocale.current = locale;
      queryClient.clear();
    }
  }, [locale, queryClient]);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        userFacingErrors(() => messagesFor(localeRef.current).common),
        httpBatchLink({
          transformer: SuperJSON,
          url: `${apiOrigin}/api/trpc`,
          maxItems: 20,
          headers: async () => {
            const token = await getTokenRef.current();
            return {
              "accept-language": localeRef.current,
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            };
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
