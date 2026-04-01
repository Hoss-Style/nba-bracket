"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import MobileBracket from "@/components/MobileBracket";
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
              <div className="desktop-bracket">
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
              <div className="mobile-bracket-wrapper">
                <MobileBracket
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
