import type { Metadata } from "next";

import "@/app/globals.css";

import { appMeta } from "@/lib/constants";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
