"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { saveActualResults, submitEntry, getAllEntries } from "@/lib/supabase";
import { getTeamByAbbr } from "@/lib/teams";
import {
  generateHigherSeedsWin,
  generateAllUpsets,
  generateRandomResults,
  generatePartialResults,
  generateClearResults,
  generateTestEntries,
} from "@/lib/debugScenarios";

interface StatusInfo {
  label: string;
  champion: string;
  mvp: string;
}

export default function DebugPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState("");

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || "lew2026";

  async function applyScenario(
    label: string,
    generator: () => { picks: import("@/lib/types").BracketPicks; finalsMVP: string }
  ) {
    setLoading(label);
    const { picks, finalsMVP } = generator();
    await saveActualResults(picks, finalsMVP);
    const champion = picks.finals?.winner;
    const team = champion ? getTeamByAbbr(champion) : null;
    setStatus({
      label,
      champion: team ? `${team.name} (${team.abbreviation})` : champion || "None",
      mvp: finalsMVP || "None",
    });
    setLoading("");
  }

  async function loadTestEntries() {
    setLoading("Loading entries...");
    const existing = await getAllEntries();
    const testEmails = ["pete@test.com", "ursula@test.com", "randy@test.com"];
    // Remove existing test entries to avoid duplicates
    if (typeof window !== "undefined") {
      const filtered = existing.filter((e) => !testEmails.includes(e.email));
      localStorage.setItem("bracket_entries", JSON.stringify(filtered));
    }
    const entries = generateTestEntries();
    for (const entry of entries) {
      await submitEntry(entry);
    }
    setStatus({ label: "Loaded 3 test entries", champion: "", mvp: "" });
    setLoading("");
  }

  async function clearEntries() {
    setLoading("Clearing...");
    if (typeof window !== "undefined") {
      localStorage.removeItem("bracket_entries");
    }
    setStatus({ label: "All entries cleared", champion: "", mvp: "" });
    setLoading("");
  }

  if (!authenticated) {
    return (
      <>
        <Nav />
        <div style={{ paddingTop: "6rem" }}>
          <div className="submit-section" style={{ maxWidth: "400px" }}>
            <h3>Debug Mode</h3>
            <p>Enter the admin password to access debug tools.</p>
            <div className="form-group">
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && password === ADMIN_PASS && setAuthenticated(true)}
              />
            </div>
            <button
              onClick={() => password === ADMIN_PASS && setAuthenticated(true)}
              className="btn btn-primary submit-btn"
            >
              Enter
            </button>
          </div>
        </div>
      </>
    );
  }

  const scenarioButtons = [
    { label: "Higher Seeds Win (Sweeps)", fn: generateHigherSeedsWin },
    { label: "All Upsets (7 Games)", fn: generateAllUpsets },
    { label: "Random Results", fn: generateRandomResults },
    { label: "R1 Only", fn: () => generatePartialResults(1) },
    { label: "R1 + R2 Only", fn: () => generatePartialResults(2) },
    { label: "Through Conf Finals", fn: () => generatePartialResults(3) },
    { label: "Clear All Results", fn: generateClearResults },
  ];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: "4rem" }}>
        <div className="page-container" style={{ maxWidth: "700px" }}>
          <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Debug: Scoring Scenarios</h1>
          <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.9rem" }}>
            Click a scenario to populate results, then check the scoreboard.
          </p>

          {/* Result Scenarios */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Result Scenarios
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {scenarioButtons.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applyScenario(s.label, s.fn)}
                  disabled={!!loading}
                  className="btn"
                  style={{
                    padding: "0.75rem 1rem",
                    fontSize: "0.85rem",
                    background: s.label.includes("Clear") ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${s.label.includes("Clear") ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                    color: s.label.includes("Clear") ? "#ef4444" : "var(--text-primary)",
                    borderRadius: "0.5rem",
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading === s.label ? "Saving..." : s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Entries */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Test Entries
            </h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={loadTestEntries}
                disabled={!!loading}
                className="btn"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e",
                  borderRadius: "0.5rem",
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading === "Loading entries..." ? "Loading..." : "Load 3 Test Entries"}
              </button>
              <button
                onClick={clearEntries}
                disabled={!!loading}
                className="btn"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  borderRadius: "0.5rem",
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Clear All Entries
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              Creates: Perfect Pete (all higher seeds), Upset Ursula (all upsets), Random Randy
            </p>
          </div>

          {/* Status Display */}
          {status && (
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--accent-green)", fontWeight: 600, marginBottom: "0.5rem" }}>
                Applied: {status.label}
              </div>
              {status.champion && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Champion: <strong style={{ color: "var(--text-primary)" }}>{status.champion}</strong>
                  {status.mvp && (
                    <span style={{ marginLeft: "1.5rem" }}>
                      MVP: <strong style={{ color: "var(--text-primary)" }}>{status.mvp}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <a href="/scoreboard" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem", textDecoration: "none" }}>
              View Scoreboard
            </a>
            <a href="/admin" className="btn" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Admin Panel
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
