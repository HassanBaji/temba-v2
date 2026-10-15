import { type Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Manage",
};

export default function ManageLayout({ children }: { children: ReactNode }) {
  return children;
}
