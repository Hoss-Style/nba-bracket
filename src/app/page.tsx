"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-badge">Lew&apos;s Annual Challenge</div>
        <h1 className="hero-title">NBA Playoff Bracket</h1>
        <div className="hero-year">2026</div>
        <p className="hero-subtitle">
          Pick every series winner, nail the number of games, call the upsets, and predict the Finals MVP.
          The one with the most points takes the pot.
        </p>
        <div className="hero-buttons">
          <Link href="/bracket" className="btn btn-primary">
            Make Your Picks &rarr;
          </Link>
          <Link href="/scoreboard" className="btn btn-secondary">
            View Scoreboard
          </Link>
        </div>

        <div className="info-section">
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">&#127936;</div>
              <h3>Pick Every Series</h3>
              <p>Select the winner and number of games for all 15 playoff series from Round 1 through the NBA Finals.</p>
            </div>
            <div className="info-card">
              <div className="info-card-icon">&#128200;</div>
              <h3>Live Scoreboard</h3>
              <p>Track everyone&apos;s brackets in real time as the playoffs unfold. Full transparency, updated live.</p>
            </div>
            <div className="info-card">
              <div className="info-card-icon">&#128176;</div>
              <h3>Win the Pot</h3>
              <p>$25 entry fee. 1st place: 65%, 2nd: 25%, 3rd: 10%. Bonus $100 added to the pot if 15+ entries.</p>
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div className="info-card" style={{ marginTop: "1.25rem" }}>
            <h3 style={{ textAlign: "center", marginBottom: "0.75rem" }}>Scoring System</h3>
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
                <tr>
                  <td>First Round</td>
                  <td>1 pt</td>
                  <td>1 pt</td>
                  <td>1 pt</td>
                </tr>
                <tr>
                  <td>Conf. Semis</td>
                  <td>2 pts</td>
                  <td>2 pts</td>
                  <td>2 pts</td>
                </tr>
                <tr>
                  <td>Conf. Finals</td>
                  <td>3 pts</td>
                  <td>3 pts</td>
                  <td>3 pts</td>
                </tr>
                <tr>
                  <td>NBA Finals</td>
                  <td>5 pts</td>
                  <td>5 pts</td>
                  <td>5 pts</td>
                </tr>
                <tr>
                  <td>Finals MVP</td>
                  <td colSpan={3} style={{ fontWeight: 700, color: "var(--accent-gold)" }}>10 pts</td>
                </tr>
              </tbody>
            </table>
            <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Upset bonus: lower seed beats higher seed. Games points only awarded if winner is correct.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
