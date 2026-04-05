"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import MobileBracket from "@/components/MobileBracket";
import { BracketPicks, Entry } from "@/lib/types";
import { createEmptyPicks, isPicksComplete, countCompletedPicks } from "@/lib/emptyPicks";
import { getEntryByEmail, updateEntry } from "@/lib/supabase";
import { isBeforeDeadline } from "@/lib/deadline";
import { getMatchupStatuses } from "@/lib/scoring";
import { getActualResults } from "@/lib/supabase";
import confetti from "canvas-confetti";

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
  const [error, setError] = useState("");
  const [user, setUser] = useState<BracketUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [onMvpStep, setOnMvpStep] = useState(false);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [editing, setEditing] = useState(false);
  const [matchupStatuses, setMatchupStatuses] = useState<Record<string, import("@/lib/types").MatchupResultStatus> | null>(null);
  const [mvpCorrect, setMvpCorrect] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const bracketRef = useRef<HTMLDivElement>(null);

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
          setExistingEntry(entry);

          // Load actual results for status display
          const actualResults = await getActualResults();
          if (actualResults) {
            setMatchupStatuses(getMatchupStatuses(entry.picks, actualResults.picks));
            if (actualResults.finalsMVP && entry.picks.finalsMVP) {
              setMvpCorrect(
                entry.picks.finalsMVP.toLowerCase().trim() === actualResults.finalsMVP.toLowerCase().trim()
              );
            }
          }
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

  // Whether user has a previously submitted bracket
  const hasSubmitted = existingEntry && existingEntry.picks.westR1_1 !== null;

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
          setExistingEntry({ ...existing, picks: picksWithMVP });
          setEditing(false);
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#7b2d8e", "#e56020", "#ff8844", "#ffffff"],
          });
          setTimeout(() => confetti({
            particleCount: 80,
            spread: 100,
            origin: { x: 0.2, y: 0.5 },
            colors: ["#7b2d8e", "#e56020", "#ff8844"],
          }), 300);
          setTimeout(() => confetti({
            particleCount: 80,
            spread: 100,
            origin: { x: 0.8, y: 0.5 },
            colors: ["#7b2d8e", "#e56020", "#ff8844"],
          }), 600);
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

  const handleShare = async () => {
    const entryId = existingEntry?.id || "";
    const url = `${window.location.origin}/bracket/${entryId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async () => {
    const el = bracketRef.current;
    if (!el) return;
    setExporting(true);

    try {
      const { toPng } = await import("html-to-image");
      el.classList.add("export-mode");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-dark").trim() || "#0a0a0f",
      });

      el.classList.remove("export-mode");

      const link = document.createElement("a");
      link.download = `${user?.name || "bracket"}-picks.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      bracketRef.current?.classList.remove("export-mode");
    }

    setExporting(false);
  };

  const noop = () => {};

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

  // Show read-only view if user already submitted and isn't editing
  if (hasSubmitted && !editing) {
    return (
      <>
        <Nav />
        <div className="nav-spacer">
          <div className="page-container bracket-page-container">
            <div className="bracket-view-header">
              <span className="bracket-view-name">{user.name}&apos;s Bracket</span>
              <div className="bracket-view-actions">
                <button onClick={handleShare} className="btn btn-secondary btn-sm">
                  {copied ? "Copied!" : "Share"}
                </button>
                <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm">
                  {exporting ? "Saving..." : "Export"}
                </button>
                {!locked && (
                  <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm">
                    Edit Picks
                  </button>
                )}
              </div>
            </div>

            <div className="readonly-bracket-scroll" ref={bracketRef}>
              <Bracket
                picks={existingEntry!.picks}
                onPicksChange={noop}
                disabled={true}
                finalsMVP={existingEntry!.picks.finalsMVP || ""}
                onFinalsMVPChange={noop}
                matchupStatuses={matchupStatuses}
                mvpCorrect={mvpCorrect}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (locked && !hasSubmitted) {
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
