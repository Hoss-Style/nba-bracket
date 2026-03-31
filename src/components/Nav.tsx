"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { isBeforeDeadline, getTimeUntilDeadline } from "@/lib/deadline";

export default function Nav() {
  const pathname = usePathname();
  const isBracketPage = pathname === "/bracket";

  const [countdown, setCountdown] = useState(getTimeUntilDeadline());

  useEffect(() => {
    if (!isBracketPage) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, [isBracketPage]);

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
      {isBracketPage && isBeforeDeadline() && !countdown.expired && (
        <div className="nav-countdown">
          <span className="nav-countdown-label">Locks in</span>
          <strong>{countdown.days}d {countdown.hours}h {countdown.minutes}m</strong>
        </div>
      )}
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
