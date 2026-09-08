"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <nav className="topnav">
      <h1 style={{ fontSize: 19 }}>NoyyalSense</h1>
      <div className="links">
        <Link href="/" className={isActive("/") ? "active" : ""}>
          Regulator dashboard
        </Link>
        <Link href="/verify" className={isActive("/verify") ? "active" : ""}>
          Buyer / DPP view
        </Link>
      </div>
    </nav>
  );
}
