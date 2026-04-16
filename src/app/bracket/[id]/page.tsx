"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import { Entry, MatchupResultStatus } from "@/lib/types";
import { getEntryById, getActualResults } from "@/lib/supabase";
import { getMatchupStatuses, getEliminatedTeams } from "@/lib/scoring";
import Toast from "@/components/Toast";

export default function ViewBracketPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [matchupStatuses, setMatchupStatuses] = useState<Record<string, MatchupResultStatus> | null>(null);
  const [mvpCorrect, setMvpCorrect] = useState<boolean | null>(null);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" });
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [result, actualResults] = await Promise.all([
          getEntryById(id),
          getActualResults(),
        ]);
        if (result) {
          setEntry(result);
          if (actualResults) {
            setMatchupStatuses(getMatchupStatuses(result.picks, actualResults.picks));
            setEliminatedTeams(getEliminatedTeams(actualResults.picks));
            if (actualResults.finalsMVP && result.picks.finalsMVP) {
              setMvpCorrect(
                result.picks.finalsMVP.toLowerCase().trim() === actualResults.finalsMVP.toLowerCase().trim()
              );
            }
          }
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const noop = () => {};

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ show: true, message: "Link copied!", type: "success" });
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setToast({ show: true, message: "Link copied!", type: "success" });
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const el = bracketRef.current;
    if (!el) return;
    setExporting(true);

    try {
      const { toPng } = await import("html-to-image");

      // Force desktop layout for capture
      el.classList.add("export-mode");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-dark").trim() || "#0a0a0f",
      });

      el.classList.remove("export-mode");

      const link = document.createElement("a");
      link.download = `${entry?.name || "bracket"}-picks.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Fallback: just remove export-mode if something fails
      el.classList.remove("export-mode");
    }

    setExporting(false);
  };

  return (
    <>
      <Nav />
      <div className="nav-spacer">
        <div className="page-container bracket-page-container">
          {loading ? (
            <div className="page-header"><h1>Loading bracket...</h1></div>
          ) : error || !entry ? (
            <div className="page-header">
              <h1>Bracket Not Found</h1>
              <p style={{ color: "var(--text-muted)" }}>
                This bracket doesn&apos;t exist or has been removed.
              </p>
              <a href="/scoreboard" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                &larr; Back to Scoreboard
              </a>
            </div>
          ) : (
            <>
              <div className="bracket-view-header">
                <a href="/scoreboard" className="bracket-view-back">&larr; Scoreboard</a>
                <span className="bracket-view-name">{entry.name}&apos;s Bracket</span>
                <div className="bracket-view-actions">
                  <button onClick={handleShare} className="btn btn-secondary btn-sm">
                    Share
                  </button>
                  <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm">
                    {exporting ? "Saving..." : "Export"}
                  </button>
                </div>
              </div>

              <div className="readonly-bracket-scroll" ref={bracketRef}>
                <Bracket
                  picks={entry.picks}
                  onPicksChange={noop}
                  disabled={true}
                  finalsMVP={entry.picks.finalsMVP || ""}
                  onFinalsMVPChange={noop}
                  matchupStatuses={matchupStatuses}
                  mvpCorrect={mvpCorrect}
                  eliminatedTeams={eliminatedTeams}
                />
              </div>

            </>
          )}
        </div>
      </div>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
    </>
  );
}
