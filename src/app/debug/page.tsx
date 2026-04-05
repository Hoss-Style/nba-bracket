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
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState("");
  const [deadlineOverride, setDeadlineOverride] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("debug_deadline_override") || "none";
    }
    return "none";
  });
  const [localStorageView, setLocalStorageView] = useState(false);

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

  function setDeadlineMode(mode: string) {
    if (mode === "none") {
      localStorage.removeItem("debug_deadline_override");
    } else {
      localStorage.setItem("debug_deadline_override", mode);
    }
    setDeadlineOverride(mode);
    setStatus({ label: `Deadline: ${mode === "locked" ? "LOCKED (closed)" : mode === "open" ? "OPEN (accepting picks)" : "Using real deadline"}`, champion: "", mvp: "" });
  }

  function clearMyBracket() {
    const stored = localStorage.getItem("bracket_user");
    if (!stored) {
      setStatus({ label: "No user logged in", champion: "", mvp: "" });
      return;
    }
    const user = JSON.parse(stored);
    const entries = JSON.parse(localStorage.getItem("bracket_entries") || "[]");
    const filtered = entries.filter((e: { email: string }) => e.email.toLowerCase() !== user.email.toLowerCase());
    localStorage.setItem("bracket_entries", JSON.stringify(filtered));
    setStatus({ label: `Cleared bracket for ${user.name}`, champion: "", mvp: "" });
  }

  function clearSocialData() {
    localStorage.removeItem("bracket_reactions");
    localStorage.removeItem("bracket_comments");
    setStatus({ label: "All comments & reactions cleared", champion: "", mvp: "" });
  }

  function clearCurrentUser() {
    localStorage.removeItem("bracket_user");
    setStatus({ label: "Logged out — will redirect to home on next page load", champion: "", mvp: "" });
  }

  function getLocalStorageData(): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("bracket_")) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    const debugKey = "debug_deadline_override";
    const debugVal = localStorage.getItem(debugKey);
    if (debugVal) data[debugKey] = debugVal;
    return data;
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

          {/* Deadline Override */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Deadline Override
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {[
                { mode: "none", label: "Real Deadline", color: "rgba(255,255,255,0.1)" },
                { mode: "open", label: "Force Open", color: "rgba(34,197,94,0.25)" },
                { mode: "locked", label: "Force Locked", color: "rgba(239,68,68,0.3)" },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setDeadlineMode(opt.mode)}
                  className="btn"
                  style={{
                    padding: "0.75rem",
                    fontSize: "0.85rem",
                    background: deadlineOverride === opt.mode ? opt.color : "rgba(255,255,255,0.05)",
                    border: `2px solid ${deadlineOverride === opt.mode ? opt.color : "rgba(255,255,255,0.1)"}`,
                    color: deadlineOverride === opt.mode ? "white" : "var(--text-secondary)",
                    borderRadius: "0.5rem",
                    fontWeight: deadlineOverride === opt.mode ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              Override affects all pages. Refresh after changing to see the effect.
            </p>
          </div>

          {/* Data Management */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Data Management
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                onClick={clearMyBracket}
                className="btn"
                style={{
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  color: "#fbbf24",
                  borderRadius: "0.5rem",
                }}
              >
                Clear My Bracket
              </button>
              <button
                onClick={clearSocialData}
                className="btn"
                style={{
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  color: "#fbbf24",
                  borderRadius: "0.5rem",
                }}
              >
                Clear Comments & Reactions
              </button>
              <button
                onClick={clearCurrentUser}
                className="btn"
                style={{
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  borderRadius: "0.5rem",
                }}
              >
                Log Out Current User
              </button>
              <button
                onClick={() => setLocalStorageView(!localStorageView)}
                className="btn"
                style={{
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#818cf8",
                  borderRadius: "0.5rem",
                }}
              >
                {localStorageView ? "Hide" : "View"} localStorage
              </button>
            </div>
          </div>

          {/* localStorage Viewer */}
          {localStorageView && (
            <div style={{
              marginBottom: "2rem",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              padding: "1rem",
              maxHeight: "400px",
              overflow: "auto",
            }}>
              <h4 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                localStorage (bracket_* keys)
              </h4>
              {Object.entries(getLocalStorageData()).map(([key, value]) => (
                <div key={key} style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 600, marginBottom: "0.2rem" }}>{key}</div>
                  <pre style={{
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    maxHeight: "120px",
                    overflow: "auto",
                  }}>
                    {(() => { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } })()}
                  </pre>
                </div>
              ))}
            </div>
          )}

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
