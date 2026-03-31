"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/bracket", label: "Make Picks" },
    { href: "/scoreboard", label: "Scoreboard" },
  ];

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        NBA Bracket Challenge
      </Link>
      <div className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? "nav-link-active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
