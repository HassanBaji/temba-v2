import "~/styles/globals.css";

import { arSA } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { type Appearance } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";

import { LocaleProvider } from "~/components/locale-provider";
import { NavigationTrail } from "~/components/navigation-trail";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { getRequestLocale } from "~/lib/request-locale";
import { TRPCReactProvider } from "~/trpc/react";
import { localeDirection } from "@repo/i18n/locale";

import { arabic, display, mono, sans } from "./fonts";

export const metadata: Metadata = {
  title: {
    template: "%s · Temba",
    default: "Temba",
  },
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
    // Per-scheme values live in globals.css so the popover follows dark mode.
    colorPrimary: "var(--clerk-primary)",
    colorPrimaryForeground: "var(--clerk-primary-foreground)",
    colorBackground: "var(--clerk-background)",
    colorInput: "var(--clerk-background)",
    colorInputForeground: "var(--clerk-foreground)",
    colorForeground: "var(--clerk-foreground)",
    colorMutedForeground: "var(--clerk-muted-foreground)",
    colorDanger: "var(--clerk-danger)",
    colorNeutral: "var(--clerk-neutral)",
    borderRadius: "0.75rem",
  },
} satisfies Appearance;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={`${sans.variable} ${mono.variable} ${display.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <NavigationTrail />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            appearance={clerkAppearance}
            localization={locale === "ar" ? arSA : undefined}
            signInUrl="/login"
            signUpUrl="/signup"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <LocaleProvider locale={locale}>
              <TRPCReactProvider>
                {children}
                <Toaster />
              </TRPCReactProvider>
            </LocaleProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
