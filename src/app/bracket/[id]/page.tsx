"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Bracket from "@/components/Bracket";
import { Entry, Reaction, Comment, MatchupResultStatus } from "@/lib/types";
import { getEntryById, getActualResults, getCommentReactions, addReaction, getComments, addComment } from "@/lib/supabase";
import { getMatchupStatuses, getEliminatedTeams } from "@/lib/scoring";

export default function ViewBracketPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [matchupStatuses, setMatchupStatuses] = useState<Record<string, MatchupResultStatus> | null>(null);
  const [mvpCorrect, setMvpCorrect] = useState<boolean | null>(null);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, Reaction[]>>({});
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
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
            setEliminatedTeams(getEliminatedTeams(actualResults.picks));
            if (actualResults.finalsMVP && result.picks.finalsMVP) {
              setMvpCorrect(
                result.picks.finalsMVP.toLowerCase().trim() === actualResults.finalsMVP.toLowerCase().trim()
              );
            }
          }
          // Load comments then reactions per comment
          const c = await getComments(result.id || id);
          setComments(c);
          const reactionsMap: Record<string, Reaction[]> = {};
          await Promise.all(
            c.map(async (comment) => {
              if (comment.id) {
                reactionsMap[comment.id] = await getCommentReactions(comment.id);
              }
            })
          );
          setCommentReactions(reactionsMap);
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

  useEffect(() => {
    if (!activeReactionPicker) return;
    const handleClick = () => setActiveReactionPicker(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [activeReactionPicker]);

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

  const EMOJI_OPTIONS = ["\uD83D\uDD25", "\uD83D\uDC80", "\uD83E\uDD21", "\uD83D\uDCAF", "\uD83D\uDE02", "\uD83D\uDE33", "\uD83C\uDFC6", "\uD83D\uDC4D"];

  const handleReaction = async (commentId: string, emoji: string) => {
    const stored = localStorage.getItem("bracket_user");
    const userName = stored ? JSON.parse(stored).name : "Anonymous";
    await addReaction({
      entryId: entry?.id || id,
      commentId,
      emoji,
      userName,
      createdAt: new Date().toISOString(),
    });
    const updated = await getCommentReactions(commentId);
    setCommentReactions((prev) => ({ ...prev, [commentId]: updated }));
    setActiveReactionPicker(null);
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
                      <div className="comment-reactions">
                        {(() => {
                          const rs = commentReactions[c.id || ""] || [];
                          const counts: Record<string, number> = {};
                          rs.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
                          return Object.entries(counts).map(([emoji, count]) => (
                            <span key={emoji} className="reaction-badge reaction-badge-sm">
                              {emoji} {count}
                            </span>
                          ));
                        })()}
                        <div className="reaction-add-wrapper">
                          <button
                            className="reaction-add-btn reaction-add-btn-sm"
                            onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(activeReactionPicker === c.id ? null : (c.id || null)); }}
                          >
                            +
                          </button>
                          {activeReactionPicker === c.id && (
                            <div className="reaction-picker reaction-picker-dropdown">
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button key={emoji} className="reaction-emoji-btn" onClick={() => handleReaction(c.id || "", emoji)}>
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
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
