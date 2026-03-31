"use client";

import Nav from "@/components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <div className="hero" style={{ paddingTop: "3.5rem" }}>
        <div className="hero-content">
          <div className="hero-badge">Lew&apos;s Annual Challenge</div>
          <h1 className="hero-title">NBA Playoff Bracket 2026</h1>
          <p className="hero-subtitle">
            Pick every series winner, nail the number of games, call the upsets, and predict the Finals MVP.
            The one with the most points takes the pot.
          </p>

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
          </div>
        </div>
      </div>
    </>
  );
}
