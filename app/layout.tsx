import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "NoyyalSense — Smart Tiruppur",
  description: "Regulator dashboard for the NoyyalSense Green Ledger project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
