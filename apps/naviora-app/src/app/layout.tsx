import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";

import { appMeta } from "@/lib/constants";

const GA_MEASUREMENT_ID = "G-HQRYNT99M9";
const TENCENT_CAPTCHA_APP_ID = process.env.NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID?.trim();

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
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {TENCENT_CAPTCHA_APP_ID ? (
          <Script
            src="https://ca.turing.captcha.qcloud.com/TJNCaptcha-global.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
