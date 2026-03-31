"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import MobileBracket from "@/components/MobileBracket";
import { BracketPicks } from "@/lib/types";
import { createEmptyPicks, isPicksComplete, countCompletedPicks } from "@/lib/emptyPicks";
import { submitEntry, getEntryByEmail, updateEntry } from "@/lib/supabase";
import { isBeforeDeadline } from "@/lib/deadline";

export default function BracketPage() {
  const [picks, setPicks] = useState<BracketPicks>(createEmptyPicks());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [finalsMVP, setFinalsMVP] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Edit mode
  const [mode, setMode] = useState<"new" | "edit">("new");

  // Deadline
  const [locked, setLocked] = useState(!isBeforeDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isBeforeDeadline()) setLocked(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const picksWithMVP = { ...picks, finalsMVP };
  const completedCount = countCompletedPicks(picksWithMVP);
  const totalPicks = 16;
  const allComplete = isPicksComplete(picksWithMVP);

  const handleSubmit = async () => {
    if (locked) {
      setError("Submissions are locked. The playoffs have begun!");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!allComplete) {
      setError("Please complete all picks including Finals MVP before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Check if email already exists — if so, update; otherwise create new
      const existing = await getEntryByEmail(email.trim());
      if (existing) {
        const success = await updateEntry({
          id: existing.id,
          name: name.trim(),
          email: email.trim(),
          picks: picksWithMVP,
          submittedAt: new Date().toISOString(),
        });
        if (success) {
          setMode("edit");
          setSubmitted(true);
        } else {
          setError("Failed to update. Please try again.");
        }
      } else {
        const entry = await submitEntry({
          name: name.trim(),
          email: email.trim(),
          picks: picksWithMVP,
          submittedAt: new Date().toISOString(),
        });
        if (entry) {
          setSubmitted(true);
        } else {
          setError("Failed to submit. Please try again.");
        }
      }
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div className="success-card">
            <div className="success-icon">&#10003;</div>
            <h2>{mode === "edit" ? "Picks Updated!" : "Picks Submitted!"}</h2>
            <p>
              Nice work, <strong>{name}</strong>.{" "}
              {mode === "edit"
                ? "Your bracket has been updated. You can edit again anytime before the deadline."
                : "Your bracket has been locked in. You can edit it anytime before the playoffs begin."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
              <a href="/scoreboard" className="btn btn-primary">
                View Scoreboard &rarr;
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSubmitted(false);
                }}
              >
                Edit My Picks
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Locked state
  if (locked) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div className="page-container">
            <div className="locked-banner">
              <h2>Picks Are Locked</h2>
              <p>
                The NBA Playoffs have begun! Submissions and edits are no longer accepted.
                <br />
                Head to the scoreboard to track the action.
              </p>
              <a href="/scoreboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                View Scoreboard &rarr;
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="nav-spacer">
        <div className="page-container bracket-page-container">

          {/* Desktop Bracket */}
          <div className="desktop-bracket">
            <Bracket
              picks={picks}
              onPicksChange={setPicks}
              finalsMVP={finalsMVP}
              onFinalsMVPChange={setFinalsMVP}
            />
          </div>

          {/* Mobile Bracket */}
          <div className="mobile-bracket-wrapper">
            <MobileBracket
              picks={picks}
              onPicksChange={setPicks}
              finalsMVP={finalsMVP}
              onFinalsMVPChange={setFinalsMVP}
            />
          </div>

          {/* Floating Submit Button */}
          <div className="floating-submit">
            <button
              onClick={() => { setError(""); setShowSubmitModal(true); }}
              disabled={!allComplete}
              className={`btn submit-btn ${allComplete ? "btn-gold" : "btn-secondary"}`}
              style={{ opacity: allComplete ? 1 : 0.6, width: "100%" }}
            >
              {allComplete
                ? mode === "edit"
                  ? "Save Updated Picks ✓"
                  : "Submit Bracket ✓"
                : `Complete All Picks First (${completedCount}/${totalPicks})`}
            </button>
          </div>

          {/* Submit Modal */}
          {showSubmitModal && (
            <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowSubmitModal(false)}>&times;</button>
                <h3>{mode === "edit" ? "Save Changes" : "Submit Your Bracket"}</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                  {mode === "edit"
                    ? "Review your changes and save. You can edit again before the deadline."
                    : "Enter your info below. You can edit your picks anytime before the playoffs start."}
                </p>

                {error && (
                  <div style={{ color: "var(--accent-red)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    {error}
                  </div>
                )}

                {mode !== "edit" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-gold submit-btn"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                >
                  {submitting
                    ? "Saving..."
                    : mode === "edit"
                    ? "Save Updated Picks"
                    : "Lock In My Picks"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
