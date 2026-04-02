"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import { Entry, Reaction, Comment, MatchupResultStatus } from "@/lib/types";
import { getEntryById, getActualResults, getReactions, addReaction, getComments, addComment } from "@/lib/supabase";
import { getMatchupStatuses } from "@/lib/scoring";

export default function ViewBracketPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [matchupStatuses, setMatchupStatuses] = useState<Record<string, MatchupResultStatus> | null>(null);
  const [mvpCorrect, setMvpCorrect] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
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
            if (actualResults.finalsMVP && result.picks.finalsMVP) {
              setMvpCorrect(
                result.picks.finalsMVP.toLowerCase().trim() === actualResults.finalsMVP.toLowerCase().trim()
              );
            }
          }
          // Load reactions and comments
          const [r, c] = await Promise.all([
            getReactions(result.id || id),
            getComments(result.id || id),
          ]);
          setReactions(r);
          setComments(c);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const el = bracketRef.current;
    if (!el) return;
    setExporting(true);

    // Force full-width desktop layout for capture
    el.classList.add("export-mode");
    // Wait for reflow
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-dark").trim(),
      scale: 2,
      width: 1400,
      windowWidth: 1400,
    });

    el.classList.remove("export-mode");
    setExporting(false);

    const link = document.createElement("a");
    link.download = `${entry?.name || "bracket"}-picks.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const EMOJI_OPTIONS = ["\uD83D\uDD25", "\uD83D\uDC80", "\uD83E\uDD21", "\uD83D\uDCAF", "\uD83D\uDE02", "\uD83D\uDE33", "\uD83C\uDFC6", "\uD83D\uDC4D"];

  const handleReaction = async (emoji: string) => {
    const stored = localStorage.getItem("bracket_user");
    const userName = stored ? JSON.parse(stored).name : "Anonymous";
    await addReaction({
      entryId: entry?.id || id,
      emoji,
      userName,
      createdAt: new Date().toISOString(),
    });
    const updated = await getReactions(entry?.id || id);
    setReactions(updated);
    setShowReactionPicker(false);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    const stored = localStorage.getItem("bracket_user");
    const userName = stored ? JSON.parse(stored).name : "Anonymous";
    await addComment({
      entryId: entry?.id || id,
      userName,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    const updated = await getComments(entry?.id || id);
    setComments(updated);
    setCommentText("");
    setPostingComment(false);
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
                    {copied ? "Copied!" : "Share"}
                  </button>
                  <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm">
                    {exporting ? "Saving..." : "Export"}
                  </button>
                  <div className="reactions-inline">
                    {(() => {
                      const counts: Record<string, number> = {};
                      reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
                      return Object.entries(counts).map(([emoji, count]) => (
                        <span key={emoji} className="reaction-badge">
                          {emoji} {count}
                        </span>
                      ));
                    })()}
                    <div className="reaction-add-wrapper">
                      <button
                        className="reaction-add-btn"
                        onClick={() => setShowReactionPicker(!showReactionPicker)}
                      >
                        +
                      </button>
                      {showReactionPicker && (
                        <div className="reaction-picker reaction-picker-dropdown">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button key={emoji} className="reaction-emoji-btn" onClick={() => handleReaction(emoji)}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
                />
              </div>

              {/* Comments */}
              <div className="bracket-comments">
                <h3 className="comments-title">Comments ({comments.length})</h3>
                <div className="comments-list">
                  {comments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{c.userName}</span>
                        <span className="comment-time">
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" "}
                          {new Date(c.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="comment-text">{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="comment-form">
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Leave a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleComment}
                    disabled={postingComment || !commentText.trim()}
                  >
                    {postingComment ? "..." : "Post"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
