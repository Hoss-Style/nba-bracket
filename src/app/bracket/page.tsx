"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import MobileBracket from "@/components/MobileBracket";
import { BracketPicks } from "@/lib/types";
import { createEmptyPicks, isPicksComplete, countCompletedPicks } from "@/lib/emptyPicks";
import { getEntryByEmail, updateEntry } from "@/lib/supabase";
import { isBeforeDeadline } from "@/lib/deadline";

interface BracketUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function BracketPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<BracketPicks>(createEmptyPicks());
  const [finalsMVP, setFinalsMVP] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<BracketUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [onMvpStep, setOnMvpStep] = useState(false);

  // Deadline
  const [locked, setLocked] = useState(!isBeforeDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isBeforeDeadline()) setLocked(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load user from localStorage + fetch their existing picks
  useEffect(() => {
    const stored = localStorage.getItem("bracket_user");
    if (!stored) {
      router.push("/");
      return;
    }
    const userData = JSON.parse(stored) as BracketUser;
    setUser(userData);

    async function loadPicks() {
      try {
        const entry = await getEntryByEmail(userData.email);
        if (entry && entry.picks.westR1_1 !== null) {
          setPicks(entry.picks);
          setFinalsMVP(entry.picks.finalsMVP || "");
        }
      } catch {
        // Fresh bracket
      } finally {
        setLoadingUser(false);
      }
    }
    loadPicks();
  }, [router]);

  const picksWithMVP = { ...picks, finalsMVP };
  const completedCount = countCompletedPicks(picksWithMVP);
  const totalPicks = 16;
  const allComplete = isPicksComplete(picksWithMVP);

  const handleSubmit = async () => {
    if (!user) return;
    if (locked) {
      setError("Submissions are locked. The playoffs have begun!");
      return;
    }
    if (!allComplete) {
      setError("Complete all picks including Finals MVP first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const existing = await getEntryByEmail(user.email);
      if (existing) {
        const success = await updateEntry({
          ...existing,
          picks: picksWithMVP,
          submittedAt: new Date().toISOString(),
        });
        if (success) {
          setSubmitted(true);
        } else {
          setError("Failed to save. Try again.");
        }
      }
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser || !user) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            Loading...
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div className="success-card">
            <div className="success-icon">&#10003;</div>
            <h2>Picks Saved!</h2>
            <p>
              Nice work, <strong>{user.name}</strong>. Your bracket has been saved.
              You can edit anytime before the deadline.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
              <a href="/scoreboard" className="btn btn-primary">
                View Scoreboard &rarr;
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => setSubmitted(false)}
              >
                Edit My Picks
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

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
              onStepChange={(step, total) => setOnMvpStep(step === total - 1)}
            />
          </div>

          {/* Floating Submit Button */}
          <div className="floating-submit">
            <button
              onClick={handleSubmit}
              disabled={!allComplete || submitting}
              className={`btn submit-btn ${allComplete ? "btn-accent" : "btn-secondary"} ${allComplete && onMvpStep ? "submit-btn-pulse" : ""}`}
              style={{ opacity: allComplete ? 1 : 0.6, width: "100%" }}
            >
              {submitting
                ? "Saving..."
                : allComplete
                ? "Submit Bracket ✓"
                : `Complete All Picks First (${completedCount}/${totalPicks})`}
            </button>
          </div>

          {error && (
            <div style={{
              position: "fixed", bottom: "5rem", left: "50%", transform: "translateX(-50%)",
              background: "rgba(255,71,87,0.9)", color: "white", padding: "0.75rem 1.5rem",
              borderRadius: "10px", fontSize: "0.85rem", zIndex: 150, textAlign: "center",
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
