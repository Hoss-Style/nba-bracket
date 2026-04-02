"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import { Entry, MatchupResultStatus } from "@/lib/types";
import { getEntryById, getActualResults } from "@/lib/supabase";
import { getMatchupStatuses } from "@/lib/scoring";

export default function ViewBracketPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [matchupStatuses, setMatchupStatuses] = useState<Record<string, MatchupResultStatus> | null>(null);
  const [mvpCorrect, setMvpCorrect] = useState<boolean | null>(null);

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wrapperHeight, setWrapperHeight] = useState<number | undefined>(undefined);

  const updateScale = useCallback(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;
    const bracketEl = wrapper.querySelector(".bracket-container") as HTMLElement;
    if (!bracketEl) return;
    const wrapperWidth = wrapper.clientWidth;
    if (wrapperWidth >= 1024) {
      setWrapperHeight(undefined);
      return;
    }
    // Temporarily remove scale to measure natural height
    bracketEl.style.setProperty("--bracket-scale", "1");
    const naturalHeight = bracketEl.scrollHeight;
    const bracketNativeWidth = 1200;
    const scale = Math.min(wrapperWidth / bracketNativeWidth, 1);
    bracketEl.style.setProperty("--bracket-scale", String(scale));
    setWrapperHeight(naturalHeight * scale);
  }, []);

  useEffect(() => {
    if (!entry) return;
    // Wait for bracket to render
    const raf = requestAnimationFrame(() => updateScale());
    window.addEventListener("resize", updateScale);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateScale);
    };
  }, [entry, updateScale]);

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
              </div>
              <div className="readonly-bracket-scroll" ref={scrollRef} style={wrapperHeight ? { height: wrapperHeight } : undefined}>
                <Bracket
                  picks={entry.picks}
                  onPicksChange={noop}
                  disabled={true}
                  finalsMVP={entry.picks.finalsMVP || ""}
                  onFinalsMVPChange={noop}
                  matchupStatuses={matchupStatuses}
                  mvpCorrect={mvpCorrect}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
