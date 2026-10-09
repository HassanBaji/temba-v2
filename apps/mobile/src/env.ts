export const env = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined,
  apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN as string | undefined,
};
