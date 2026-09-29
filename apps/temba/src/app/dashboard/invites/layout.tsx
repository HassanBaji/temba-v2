import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Invites",
};

export default function InvitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
