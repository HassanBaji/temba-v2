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
    colorPrimary: "#0A0A0A",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorInput: "#FFFFFF",
    colorInputForeground: "#171717",
    colorForeground: "#171717",
    colorMutedForeground: "#404040",
    colorDanger: "#DC2626",
    colorNeutral: "#636363",
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
          defaultTheme="light"
          enableSystem={false}
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
