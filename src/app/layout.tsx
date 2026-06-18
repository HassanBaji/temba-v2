import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <TRPCReactProvider>
            {children}
            <Toaster />
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
