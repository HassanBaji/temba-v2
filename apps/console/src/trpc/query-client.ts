import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

import { shouldRetryQuery } from "@repo/domain/query-retry";

/**
 * A mutation that shows its own failure (an inline error, or a caught
 * `mutateAsync`) sets this meta so the fallback toast stays quiet.
 */
export const OWN_ERROR_UI = { handlesOwnError: true } as const;

export const createQueryClient = (
  onUnhandledMutationError?: (error: unknown) => void,
) =>
  new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError || mutation.meta?.handlesOwnError) {
          return;
        }
        onUnhandledMutationError?.(error);
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        retry: shouldRetryQuery,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
