import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "./navigation";
import { WalletProvider } from "./providers/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarbonCredit — Stellar Marketplace",
  description: "Trade satellite-verified carbon credits on Stellar with instant settlement.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WalletProvider>
        <div className="flex min-h-screen flex-col">
          <Navigation />
          <main className="flex-1 px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
          <footer className="border-t border-[var(--color-border)]/50 px-5 py-5 text-center">
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              CarbonCredit &middot; Built on Stellar &middot; Verified by Sentinel-2/openEO
            </p>
          </footer>
        </div>
        </WalletProvider>
      </body>
    </html>
  );
}
