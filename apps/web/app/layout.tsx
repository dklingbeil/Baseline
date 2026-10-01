import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Baseline" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/">Baseline</Link>
          <Link href="/checkin">Check in</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
