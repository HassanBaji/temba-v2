import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Temba - the future of competitive sports",
  description: "Temba - the future of competitive sport",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const clerkAppearance = {
  theme: shadcn,
  // variables: {
  //   colorPrimary: "#C8F135",
  //   colorPrimaryForeground: "#0A0A0A",
  //   colorBackground: "#FFFFFF",
  //   colorInputBackground: "#FFFFFF",
  //   colorInput: "#171717",
  //   colorText: "#171717",
  //   colorTextSecondary: "#636363",
  //   colorDanger: "#DC2626",
  //   colorNeutral: "#636363",
  //   borderRadius: "0.75rem",
  // },
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkProvider appearance={clerkAppearance}>
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
