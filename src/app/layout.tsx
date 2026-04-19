import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "2026 NBA Bracket Challenge",
  description: "Lew's Annual NBA Playoff Bracket Challenge - Pick your winners, call the upsets, and win the pot.",
  applicationName: "Lew's Bracket",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Lew's Bracket",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.png", sizes: "1366x768", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "2026 NBA Bracket Challenge",
    description: "Pick your winners, call the upsets, and win the pot.",
    siteName: "Lew's NBA Bracket Challenge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 NBA Bracket Challenge",
    description: "Pick your winners, call the upsets, and win the pot.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
