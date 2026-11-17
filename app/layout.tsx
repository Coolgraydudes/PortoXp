import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Computer",
  description: "A tiny desktop with a few small things.",
};

// Jam 06:00–17:59 (waktu di perangkat pengunjung) = day, selebihnya = night.
// Dijalankan sebelum halaman tampil supaya nggak ada kedipan, dan dicek ulang tiap menit.
const timeOfDay = `(function(){function a(){var h=new Date().getHours();document.documentElement.dataset.time=h>=6&&h<18?"day":"night";}a();setInterval(a,60000);})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Script id="time-of-day" strategy="beforeInteractive">{timeOfDay}</Script>
        {children}
      </body>
    </html>
  );
}