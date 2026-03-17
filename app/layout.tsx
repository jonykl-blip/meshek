import type { Metadata, Viewport } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-sans",
  display: "swap",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://222.jonyklein.com"),
  title: "Meshek - AgriFlow",
  description: "Agricultural workforce management platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Meshek",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3A5420",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${notoSansHebrew.variable} font-sans antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
