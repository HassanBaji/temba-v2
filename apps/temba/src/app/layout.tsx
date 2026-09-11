import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";

import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";

import { display, mono, sans } from "./fonts";

export const metadata: Metadata = {
  title: "Temba - the future of competitive sports",
  description: "Temba - the future of competitive sport",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

/**
 * Theme for remaining Clerk drop-ins (`UserButton` on `/dashboard/you` via
 * `app-sidebar`, and any other Clerk UI chrome). Custom `/login` and `/signup`
 * screens do not use this. Keep `@clerk/ui/themes` and the matching
 * `shadcn.css` import in `globals.css`.
 */
const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: "#0A0A0A",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInput: "#171717",
    colorText: "#171717",
    colorTextSecondary: "#404040",
    colorDanger: "#DC2626",
    colorNeutral: "#636363",
    borderRadius: "0.75rem",
  },
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkProvider
            appearance={clerkAppearance}
            signInUrl="/login"
            signUpUrl="/signup"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <TRPCReactProvider>
              {children}
              <Toaster />
            </TRPCReactProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
