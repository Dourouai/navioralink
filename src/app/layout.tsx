import type { Metadata } from "next";

import "@/app/globals.css";

import { appMeta } from "@/lib/constants";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description,
  icons: {
    icon: "/assets/favicon.ico",
    shortcut: "/assets/favicon.ico",
    apple: "/assets/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
