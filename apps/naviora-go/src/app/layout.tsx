import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Naviora Go",
  description: "Dedicated smart link routing service for Naviora.",
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
