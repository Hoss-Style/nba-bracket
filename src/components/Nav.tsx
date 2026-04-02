"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { isBeforeDeadline, getTimeUntilDeadline } from "@/lib/deadline";
import { useTheme } from "@/lib/ThemeContext";

export default function Nav() {
  const pathname = usePathname();
  const isBracketPage = pathname === "/bracket";

  const { theme, toggleTheme } = useTheme();
  const [countdown, setCountdown] = useState(getTimeUntilDeadline());
  const [showRules, setShowRules] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isBracketPage) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, [isBracketPage]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/bracket", label: "Make Picks" },
    { href: "/scoreboard", label: "Scoreboard" },
    { href: "/admin", label: "Admin" },
    { href: "/debug", label: "Debug" },
  ];

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-brand">
          <span className="nav-brand-full">NBA Bracket Challenge</span>
          <span className="nav-brand-short">NBA Bracket</span>
        </Link>
        {isBracketPage && isBeforeDeadline() && !countdown.expired && (
          <div className="nav-countdown">
            <span className="nav-countdown-label">Locks in</span>
            <strong>{countdown.days}d {countdown.hours}h {countdown.minutes}m</strong>
          </div>
        )}
        {/* Desktop nav links */}
        <div className="nav-links nav-links-desktop">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? "nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <button
            className="nav-link nav-rules-btn"
            onClick={() => setShowRules(true)}
          >
            Rules
          </button>
          <button
            className="nav-link nav-theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
        </div>
        {/* Mobile hamburger button */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`hamburger-line ${menuOpen ? "hamburger-open" : ""}`} />
          <span className={`hamburger-line ${menuOpen ? "hamburger-open" : ""}`} />
          <span className={`hamburger-line ${menuOpen ? "hamburger-open" : ""}`} />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-menu-link ${pathname === link.href ? "mobile-menu-link-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              className="mobile-menu-link"
              onClick={() => { setShowRules(true); setMenuOpen(false); }}
            >
              Rules
            </button>
            <button
              className="mobile-menu-link"
              onClick={() => { toggleTheme(); setMenuOpen(false); }}
            >
              {theme === "dark" ? "\u2600\uFE0F Light Mode" : "\uD83C\uDF19 Dark Mode"}
            </button>
          </div>
        </div>
      )}

      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <button className="modal-close" onClick={() => setShowRules(false)}>&times;</button>
            <h3 style={{ textAlign: "center", marginBottom: "1rem" }}>Scoring System</h3>
            <table className="scoring-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Correct Winner</th>
                  <th># of Games</th>
                  <th>Upset Bonus</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>First Round</td><td>1 pt</td><td>1 pt</td><td>1 pt</td></tr>
                <tr><td>Conf. Semis</td><td>3 pts</td><td>2 pts</td><td>3 pts</td></tr>
                <tr><td>Conf. Finals</td><td>6 pts</td><td>3 pts</td><td>6 pts</td></tr>
                <tr><td>NBA Finals</td><td>12 pts</td><td>5 pts</td><td>12 pts</td></tr>
                <tr>
                  <td>Finals MVP</td>
                  <td colSpan={3} style={{ fontWeight: 700, color: "var(--accent-gold)" }}>15 pts</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
              Upset bonus: lower seed beats higher seed. Games points only awarded if winner is correct.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
