import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";

import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";

import { display, mono, sans } from "./fonts";

export const metadata: Metadata = {
  title: {
    template: "%s · Venue console · Temba",
    default: "Venue console · Temba",
  },
  description:
    "Run your Venue on Temba: schedule, Bookings, Courts and pricing.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

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
    borderRadius: "0.625rem",
  },
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body className="font-sans antialiased">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/login"
          signInFallbackRedirectUrl="/"
        >
          <TRPCReactProvider>
            {children}
            <Toaster />
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
