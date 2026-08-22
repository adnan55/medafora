import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const googleSans = localFont({
  src: "../../public/fonts/GoogleSans-Variable.ttf",
  variable: "--font-sans",
  weight: "300 800",
  style: "normal",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2F4858",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Medafora - Family Medicine & Health Guardian",
  description: "Family Medicine, Safety & AI Health Hub Guardian",
  applicationName: "Medafora",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Medafora",
  },
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/logo.png"],
  },
};

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${googleSans.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 1;
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FDFB] text-[#2F4858]">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
