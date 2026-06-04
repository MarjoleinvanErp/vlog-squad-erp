import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vlog Squad Erp",
    template: "%s · Vlog Squad Erp",
  },
  description: "Live speurtocht-game door Erp",
  applicationName: "Vlog Squad Erp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vlog Squad",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={display.variable}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-bg text-fg antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
              navigator.serviceWorker.register("/sw.js").catch(() => {});
            });
          }
        `,
      }}
    />
  );
}
