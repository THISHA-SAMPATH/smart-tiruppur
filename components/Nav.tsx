"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <nav className="topnav">
      <Link href="/" className="brand">NoyyalSense<span>TN</span></Link>
      <div className="links">
        <Link href="/monitoring" className={isActive("/monitoring") ? "active" : ""}>Monitoring</Link>
        <Link href="/groundwater" className={isActive("/groundwater") ? "active" : ""}>Groundwater</Link>
        <Link href="/evidence" className={isActive("/evidence") ? "active" : ""}>Evidence</Link>
        <Link href="/verify" className={isActive("/verify") ? "active" : ""}>
          Verify DPP
        </Link>
      </div>
    </nav>
  );
}
