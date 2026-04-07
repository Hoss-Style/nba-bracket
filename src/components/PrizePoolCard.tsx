"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllEntries } from "@/lib/supabase";
import {
  PAYOUT_SPLITS,
  VENMO_URL,
  VENMO_USERNAME,
  getEntryFeeDollars,
} from "@/lib/prizePool";

const POLL_MS = 12000;

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function PrizePoolCard() {
  const [bracketCount, setBracketCount] = useState<number | null>(null);
  const entryFee = getEntryFeeDollars();
  const estimatedPool =
    bracketCount !== null && entryFee > 0 ? Math.round(bracketCount * entryFee * 100) / 100 : null;

  const load = useCallback(async () => {
    try {
      const entries = await getAllEntries();
      const submitted = entries.filter((e) => e.picks.westR1_1 !== null).length;
      setBracketCount(submitted);
    } catch {
      setBracketCount(null);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="prize-pool-card" aria-labelledby="prize-pool-heading">
      <div className="prize-pool-header">
        <h2 id="prize-pool-heading" className="prize-pool-title">
          Prize pool
        </h2>
        <p className="prize-pool-sub">
          Payouts to the top 3 on the scoreboard when the bracket is final.
        </p>
      </div>

      <div className="prize-pool-stat">
        <span className="prize-pool-stat-label">Brackets submitted</span>
        <span className="prize-pool-stat-value">
          {bracketCount === null ? "—" : bracketCount}
        </span>
      </div>

      {estimatedPool !== null && estimatedPool > 0 && (
        <p className="prize-pool-estimate">
          Est. pool ({bracketCount} × {formatMoney(entryFee)}):{" "}
          <strong>{formatMoney(estimatedPool)}</strong>
        </p>
      )}

      <ul
        className={`prize-pool-splits${estimatedPool !== null && estimatedPool > 0 ? " prize-pool-splits-has-amt" : ""}`}
      >
        {PAYOUT_SPLITS.map(({ place, pct }) => {
          const share =
            estimatedPool !== null && estimatedPool > 0
              ? Math.round(estimatedPool * (pct / 100) * 100) / 100
              : null;
          return (
            <li key={place} className="prize-pool-split-row">
              <span className="prize-pool-place">{place}</span>
              <span className="prize-pool-pct">{pct}%</span>
              {share !== null && (
                <span className="prize-pool-amt">{formatMoney(share)}</span>
              )}
            </li>
          );
        })}
      </ul>

      {entryFee <= 0 && (
        <p className="prize-pool-note">
          Dollar amounts depend on the total pool. Send your entry through Venmo below.
        </p>
      )}

      <div className="prize-pool-venmo">
        <p className="prize-pool-venmo-label">Venmo</p>
        <p className="prize-pool-venmo-handle">@{VENMO_USERNAME}</p>
        <a
          href={VENMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary prize-pool-venmo-btn"
        >
          Open Venmo
          <span className="prize-pool-venmo-external" aria-hidden>
            ↗
          </span>
        </a>
      </div>
    </section>
  );
}
