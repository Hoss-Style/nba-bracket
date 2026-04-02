"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import { BracketPicks } from "@/lib/types";
import { createEmptyPicks } from "@/lib/emptyPicks";
import { getActualResults, saveActualResults, getAllEntries } from "@/lib/supabase";

export default function AdminPage() {
  const [picks, setPicks] = useState<BracketPicks>(createEmptyPicks());
  const [finalsMVP, setFinalsMVP] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [results, entries] = await Promise.all([getActualResults(), getAllEntries()]);
      if (results) {
        setPicks(results.picks);
        setFinalsMVP(results.finalsMVP);
      }
      setEntryCount(entries.length);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveActualResults({ ...picks, finalsMVP }, finalsMVP);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };


  return (
    <>
      <Nav />
      <div style={{ paddingTop: "4rem" }}>
        <div className="page-container">
          <div className="page-header">
            <h1>Admin Panel</h1>
            <p>Enter actual playoff results as they happen. The scoreboard updates automatically.</p>
            <div className="entry-count" style={{ marginTop: "0.75rem" }}>
              <span className="entry-count-dot" />
              {entryCount} entries in the system
            </div>
          </div>

          <div style={{ marginBottom: "1rem", textAlign: "center" }}>
            <span
              className="hero-badge"
              style={{
                background: "rgba(255,215,0,0.12)",
                borderColor: "rgba(255,215,0,0.25)",
                color: "var(--accent-gold)",
              }}
            >
              Entering Actual Results
            </span>
          </div>

          <Bracket
            picks={picks}
            onPicksChange={setPicks}
            finalsMVP={finalsMVP}
            onFinalsMVPChange={setFinalsMVP}
          />

          <div style={{ textAlign: "center", margin: "2rem 0" }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-gold">
              {saving ? "Saving..." : saved ? "Saved!" : "Save Results"}
            </button>
            {saved && (
              <p style={{ color: "var(--accent-green)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                Results saved. Scoreboard is now updated.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
