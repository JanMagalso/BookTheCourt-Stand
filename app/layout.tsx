import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { ConfirmBookingPanel } from "@/components/confirm-booking-panel";
import { PageLoader } from "@/components/page-loader";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getThemeInitScript, rootThemeStyle } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Court Booking Standalone",
  description: "A modern venue booking experience built with Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={rootThemeStyle}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
        {children}
        <ConfirmBookingPanel />
        <ThemeSwitcher />
        <PageLoader />
      </body>
    </html>
  );
}
