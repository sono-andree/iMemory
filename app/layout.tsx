import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "./authGuard";
import MemoryResurfacingPopup from "@/components/MemoryResurfacingPopup";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileAppChrome from "@/components/MobileAppChrome";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "iMemory",
  description:
    "La tua memoria digitale intelligente: memorie, goals, focus, chat AI e mappa mentale.",
  applicationName: "iMemory",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "iMemory",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/vector.png", type: "image/png" }],
    apple: [{ url: "/vector.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html >
      <body>
        <AuthGuard>
          <MemoryResurfacingPopup />
          {children}
          <MobileBottomNav />
          <MobileAppChrome />
        </AuthGuard>
        <SpeedInsights />
      </body>
    </html>
  );
}