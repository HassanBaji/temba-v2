import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { type Appearance } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";

import { LocaleProvider } from "~/components/locale-provider";
import { Toaster } from "~/components/ui/sonner";
import { getRequestLocale, getRequestMessages } from "~/lib/request-locale";
import { TRPCReactProvider } from "~/trpc/react";
import { localeDirection } from "@repo/i18n/locale";

import { arabic, display, mono, sans } from "./fonts";

export async function generateMetadata(): Promise<Metadata> {
  const m = (await getRequestMessages()).consoleShell;
  return {
    title: {
      template: m.metaTitleTemplate("%s"),
      default: m.metaTitle,
    },
    description: m.metaDescription,
    icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  };
}

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
    borderRadius: "0.625rem",
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
    >
      <body className="font-sans antialiased">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/login"
          signInFallbackRedirectUrl="/"
        >
          <LocaleProvider locale={locale}>
            <TRPCReactProvider>
              {children}
              <Toaster />
            </TRPCReactProvider>
          </LocaleProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
