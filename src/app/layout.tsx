import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Inter for English and numbers; Hind Siliguri for Bangla (see globals.css font stack)
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Testolife Hospital", template: "%s · Testolife" },
  description: "Testolife — hospital management system",
};

export const viewport: Viewport = { themeColor: "#0F766E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${hind.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
