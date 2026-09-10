import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "NoyyalSense — Smart Tiruppur",
  description: "Civic intelligence & regulator dashboard for Smart Tiruppur",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          <main className="shell">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
