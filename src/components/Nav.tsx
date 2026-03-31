"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { isBeforeDeadline, getTimeUntilDeadline } from "@/lib/deadline";

export default function Nav() {
  const pathname = usePathname();
  const isBracketPage = pathname === "/bracket";

  const [countdown, setCountdown] = useState(getTimeUntilDeadline());
  const [showRules, setShowRules] = useState(false);

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
    <>
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
          <button
            className="nav-link nav-rules-btn"
            onClick={() => setShowRules(true)}
          >
            Rules
          </button>
        </div>
      </nav>

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
                <tr><td>Conf. Semis</td><td>2 pts</td><td>2 pts</td><td>2 pts</td></tr>
                <tr><td>Conf. Finals</td><td>3 pts</td><td>3 pts</td><td>3 pts</td></tr>
                <tr><td>NBA Finals</td><td>5 pts</td><td>5 pts</td><td>5 pts</td></tr>
                <tr>
                  <td>Finals MVP</td>
                  <td colSpan={3} style={{ fontWeight: 700, color: "var(--accent-gold)" }}>10 pts</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
              Upset bonus: lower seed beats higher seed. Games points only awarded if winner is correct.
            </div>
            <div style={{ marginTop: "1.25rem", padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-gold)" }}>$25 entry fee</strong> &mdash; 1st: 65% &bull; 2nd: 25% &bull; 3rd: 10%. Bonus $100 added if 15+ entries.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
