import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { BackendStatusBanner } from "@/components/BackendStatusBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WeaveLink — Authenticated handloom, direct from the loom",
    template: "%s · WeaveLink",
  },
  description:
    "Voice-first listing, Digital Product Passports, and dual B2C/B2B market access for rural handloom weavers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-mist text-ink">
        <BackendStatusBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
