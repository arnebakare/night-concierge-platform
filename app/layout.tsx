import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Night Concierge Platform",
  description: "Premium mobile-first nightlife concierge platform for promoters and managers.",
  applicationName: "Night Concierge",
  appleWebApp: { capable: true, title: "Concierge", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  formatDetection: { telephone: true }
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <div className="luxury-noise" />
        {children}
      </body>
    </html>
  );
}
