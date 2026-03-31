"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import MobileBracket from "@/components/MobileBracket";
import { Entry } from "@/lib/types";
import { getEntryById } from "@/lib/supabase";

export default function ViewBracketPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await getEntryById(id);
        if (result) {
          setEntry(result);
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
      <div style={{ paddingTop: "4rem" }}>
        <div className="page-container">
          <div className="page-header">
            {loading ? (
              <h1>Loading bracket...</h1>
            ) : error || !entry ? (
              <>
                <h1>Bracket Not Found</h1>
                <p style={{ color: "var(--text-muted)" }}>
                  This bracket doesn&apos;t exist or has been removed.
                </p>
                <a href="/scoreboard" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                  &larr; Back to Scoreboard
                </a>
              </>
            ) : (
              <>
                <h1>{entry.name}&apos;s Bracket</h1>
                <p style={{ color: "var(--text-muted)" }}>
                  Read-only view &mdash; submitted {new Date(entry.submittedAt).toLocaleDateString()}
                </p>
                <a href="/scoreboard" className="btn btn-secondary btn-sm" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
                  &larr; Back to Scoreboard
                </a>
              </>
            )}
          </div>

          {!loading && entry && (
            <>
              <div className="desktop-bracket">
                <Bracket
                  picks={entry.picks}
                  onPicksChange={noop}
                  disabled={true}
                  finalsMVP={entry.picks.finalsMVP || ""}
                  onFinalsMVPChange={noop}
                />
              </div>
              <div className="mobile-bracket-wrapper">
                <MobileBracket
                  picks={entry.picks}
                  onPicksChange={noop}
                  disabled={true}
                  finalsMVP={entry.picks.finalsMVP || ""}
                  onFinalsMVPChange={noop}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
