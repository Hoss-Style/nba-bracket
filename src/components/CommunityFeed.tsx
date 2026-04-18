"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Comment, Reaction } from "@/lib/types";
import {
  getComments,
  addComment,
  getCommentReactions,
  addReaction,
  deleteReaction,
  uploadChatImage,
  chatImageThumbUrl,
  getAllEntries,
} from "@/lib/supabase";
import {
  searchGifs,
  getTrendingGifs,
  giphyConfigured,
  extractGiphyUrls,
  type GiphyGif,
} from "@/lib/giphy";
import imageCompression from "browser-image-compression";

const GLOBAL_ENTRY_ID = "global";
const POLL_INTERVAL = 8000;
const MAX_LEN = 280;

/** Shown inside the popover when the emoji button is opened */
const PICKER_EMOJIS = [
  "😀", "😂", "🤣", "😅", "😊", "🙌", "👏", "🔥", "💯", "❤️", "🤝", "😤", "🤞", "😬", "👀", "🙏",
  "⛹️", "🏀", "🏆", "🎯", "⚡", "💪", "🍿", "🤯", "😎", "🥳", "😭", "🤔", "👍", "👎", "✨",
] as const;

/** Quick-react set shown on message reaction pickers */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "🏀", "💯", "😭", "🤯"] as const;

function timeAgo(dateStr: string): string {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function avatarInitial(name: string | undefined | null): string {
  const t = (name ?? "").trim();
  return t ? t[0].toUpperCase() : "?";
}

function avatarStyle(name: string | undefined | null): { background: string; color: string } {
  const s = name ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return {
    background: `hsla(${hue}, 45%, 32%, 1)`,
    color: "hsla(0, 0%, 96%, 1)",
  };
}

/** Split a message body into text, gif, and image parts for rendering */
const MEDIA_MARKER_RE = /\[(gif|img):(https?:\/\/[^\s\]]+)\]/g;
type MsgPart =
  | { kind: "text"; value: string }
  | { kind: "gif"; url: string }
  | { kind: "img"; url: string }
  | { kind: "mention"; name: string; matched: boolean };

/** Split a text chunk further on @mentions, matching against known user names. */
function splitTextMentions(text: string, userNames: string[], me?: string | null): MsgPart[] {
  if (!text) return [];
  // Sort names longest-first so "John Lewis" matches before "John"
  const sorted = [...userNames].sort((a, b) => b.length - a.length);
  const parts: MsgPart[] = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) {
      parts.push({ kind: "text", value: text.slice(i) });
      break;
    }
    // Push text before the @
    if (at > i) parts.push({ kind: "text", value: text.slice(i, at) });
    // Try to match a known user name after @
    const after = text.slice(at + 1);
    const matched = sorted.find((n) =>
      after.toLowerCase().startsWith(n.toLowerCase())
    );
    if (matched) {
      parts.push({
        kind: "mention",
        name: matched,
        matched: Boolean(me && matched.toLowerCase() === me.toLowerCase()),
      });
      i = at + 1 + matched.length;
    } else {
      // Not a known user — just pass the "@" through as text
      parts.push({ kind: "text", value: "@" });
      i = at + 1;
    }
  }
  return parts;
}

function parseBody(text: string, userNames: string[] = [], me?: string | null): MsgPart[] {
  // Unwrap any nested [gif:[gif:URL]] / [img:[img:URL]]
  let cleaned = text;
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(
      /\[(gif|img):\s*\[(gif|img):(https?:\/\/[^\s\]]+)\]\s*\]/g,
      "[$1:$3]"
    );
  }
  cleaned = cleaned.replace(/\[(?:gif|img):\s*$/g, "");

  const parts: MsgPart[] = [];
  let lastIdx = 0;
  cleaned.replace(MEDIA_MARKER_RE, (match, kind, url, offset) => {
    if (offset > lastIdx) {
      const textChunk = cleaned.slice(lastIdx, offset);
      if (textChunk.replace(/[\s\]]+/g, "").length > 0) {
        parts.push(...splitTextMentions(textChunk, userNames, me));
      }
    }
    parts.push({ kind: kind as "gif" | "img", url });
    lastIdx = offset + match.length;
    return match;
  });
  if (lastIdx < cleaned.length) {
    const tail = cleaned.slice(lastIdx);
    if (tail.replace(/[\s\]]+/g, "").length > 0) {
      parts.push(...splitTextMentions(tail, userNames, me));
    }
  }
  return parts;
}

/** Convert raw Giphy URLs pasted into text to the [gif:...] marker on send.
 *  Skips URLs that are already inside a [gif:...] marker so we never double-wrap.
 */
function normalizeGifsOnSend(text: string): string {
  // Temporarily remove existing markers so they don't get double-wrapped
  const placeholders: string[] = [];
  const PLACEHOLDER = "\u0001GIFMARKER\u0001";
  let safe = text.replace(/\[gif:https?:\/\/[^\]\s]+\]/g, (match) => {
    placeholders.push(match);
    return PLACEHOLDER + (placeholders.length - 1) + PLACEHOLDER;
  });

  // Wrap any remaining bare Giphy URLs
  const urls = extractGiphyUrls(safe);
  for (const url of urls) {
    safe = safe.split(url).join(`[gif:${url}]`);
  }

  // Restore the original markers
  safe = safe.replace(/\u0001GIFMARKER\u0001(\d+)\u0001GIFMARKER\u0001/g, (_, idx) => {
    return placeholders[parseInt(idx, 10)] || "";
  });

  return safe;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  mine: Reaction | null;
}
function groupReactions(reactions: Reaction[], me: string | null | undefined): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count += 1;
      if (!existing.mine && me && r.userName === me) existing.mine = r;
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        mine: me && r.userName === me ? r : null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

interface CommunityFeedProps {
  /** When set, user can post; otherwise feed is read-only with a login hint */
  userName?: string | null;
}

export default function CommunityFeed({ userName }: CommunityFeedProps) {
  const [messages, setMessages] = useState<Comment[]>([]);
  const [reactionsByComment, setReactionsByComment] = useState<Record<string, Reaction[]>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // @mention state
  const [userNames, setUserNames] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  /** Position in textarea where the "@" starts (for replacement on select) */
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  // Composer emoji picker
  const composerEmojiRef = useRef<HTMLDivElement>(null);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);

  // Composer GIF picker
  const composerGifRef = useRef<HTMLDivElement>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  // Per-message reaction picker: which comment id has its picker open
  const [msgPickerFor, setMsgPickerFor] = useState<string | null>(null);
  const msgPickerRef = useRef<HTMLDivElement>(null);

  const didInitialScroll = useRef(false);

  const loadMessagesAndReactions = useCallback(async () => {
    const comments = await getComments(GLOBAL_ENTRY_ID);
    setMessages(comments);
    // Load reactions for each message with an id
    const withIds = comments.filter((c): c is Comment & { id: string } => Boolean(c.id));
    const entries = await Promise.all(
      withIds.map(async (c) => {
        const rs = await getCommentReactions(c.id);
        return [c.id, rs] as const;
      })
    );
    const map: Record<string, Reaction[]> = {};
    for (const [id, rs] of entries) map[id] = rs;
    setReactionsByComment(map);
  }, []);

  useEffect(() => {
    loadMessagesAndReactions();
    const interval = setInterval(loadMessagesAndReactions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessagesAndReactions]);

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  const scrollFeedToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (sorted.length === 0 || didInitialScroll.current) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    didInitialScroll.current = true;
  }, [sorted.length]);

  // Close composer emoji picker on outside click / Escape
  useEffect(() => {
    if (!composerEmojiOpen) return;
    const onDoc = (e: MouseEvent) => {
      const root = composerEmojiRef.current;
      if (root && !root.contains(e.target as Node)) setComposerEmojiOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setComposerEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [composerEmojiOpen]);

  // Close GIF picker on outside click / Escape
  useEffect(() => {
    if (!gifOpen) return;
    const onDoc = (e: MouseEvent) => {
      const root = composerGifRef.current;
      if (root && !root.contains(e.target as Node)) setGifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [gifOpen]);

  // Close per-message picker on outside click / Escape
  useEffect(() => {
    if (!msgPickerFor) return;
    const onDoc = (e: MouseEvent) => {
      const root = msgPickerRef.current;
      if (root && !root.contains(e.target as Node)) setMsgPickerFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMsgPickerFor(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [msgPickerFor]);

  // Load trending GIFs when picker opens (if no query yet)
  useEffect(() => {
    if (!gifOpen) return;
    if (!gifQuery && gifResults.length === 0) {
      setGifLoading(true);
      getTrendingGifs().then((gifs) => {
        setGifResults(gifs);
        setGifLoading(false);
      });
    }
  }, [gifOpen, gifQuery, gifResults.length]);

  // Debounced GIF search
  useEffect(() => {
    if (!gifOpen) return;
    if (!gifQuery.trim()) return;
    setGifLoading(true);
    const handle = setTimeout(async () => {
      const gifs = await searchGifs(gifQuery);
      setGifResults(gifs);
      setGifLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [gifQuery, gifOpen]);

  // Load user names once for @mentions (session-cached, not polled)
  useEffect(() => {
    getAllEntries().then((entries) => {
      const names = Array.from(new Set(entries.map((e) => e.name).filter(Boolean)));
      setUserNames(names);
    }).catch(() => {});
  }, []);

  // Filter mention results based on what's typed after @
  const mentionResults = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    if (!q) return userNames.slice(0, 8);
    return userNames
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionOpen, mentionQuery, userNames]);

  // Detect @mention context as user types
  const updateMentionContext = (val: string, caret: number) => {
    // Look backwards from caret for the most recent "@" not preceded by a word char
    let i = caret - 1;
    while (i >= 0) {
      const ch = val[i];
      if (ch === "@") {
        // Must be at start of string or preceded by whitespace/newline
        const before = i === 0 ? " " : val[i - 1];
        if (/\s/.test(before) || i === 0) {
          const query = val.slice(i + 1, caret);
          // Abort if query contains whitespace (mention has ended)
          if (/\s/.test(query)) {
            setMentionOpen(false);
            return;
          }
          setMentionStart(i);
          setMentionQuery(query);
          setMentionIndex(0);
          setMentionOpen(true);
          return;
        }
        setMentionOpen(false);
        return;
      }
      if (/\s/.test(ch)) {
        setMentionOpen(false);
        return;
      }
      i--;
    }
    setMentionOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const caret = e.target.selectionStart ?? val.length;
    updateMentionContext(val, caret);
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    if (mentionStart === null || !el) {
      setMentionOpen(false);
      return;
    }
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const inserted = `@${name} `;
    const next = before + inserted + after;
    if (next.length > MAX_LEN) return;
    setText(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionStart(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen || mentionResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mentionResults[mentionIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => (t + emoji).slice(0, MAX_LEN));
      setComposerEmojiOpen(false);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = text.slice(0, start) + emoji + text.slice(end);
    if (next.length > MAX_LEN) return;
    setText(next);
    setComposerEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertGif = (gif: GiphyGif) => {
    const marker = `[gif:${gif.url}]`;
    const next = text ? `${text}\n${marker}` : marker;
    if (next.length > MAX_LEN) {
      // If too long, just replace text with the gif marker
      setText(marker.slice(0, MAX_LEN));
    } else {
      setText(next);
    }
    setGifOpen(false);
    setGifQuery("");
    setGifResults([]);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be picked again
    if (!file || !userName) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("That doesn't look like an image.");
      return;
    }
    // Reject videos and enforce a 15MB raw cap before compression
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Image is too large (max 15MB).");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      // Compress: max 1600px, target ~500KB, JPEG
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.8,
      });
      const url = await uploadChatImage(compressed, userName);
      if (!url) {
        setUploadError("Upload failed. Try again.");
        return;
      }
      const marker = `[img:${url}]`;
      const next = text ? `${text}\n${marker}` : marker;
      setText(next.length > MAX_LEN ? marker.slice(0, MAX_LEN) : next);
    } catch (err) {
      console.error("Image upload failed:", err);
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const raw = text.trim();
    if (!raw || sending || !userName) return;
    const normalized = normalizeGifsOnSend(raw);
    setSending(true);
    setText("");
    await addComment({
      entryId: GLOBAL_ENTRY_ID,
      userName,
      text: normalized,
      createdAt: new Date().toISOString(),
    });
    await loadMessagesAndReactions();
    setSending(false);
    requestAnimationFrame(() => scrollFeedToBottom());
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!userName) return;
    const existing = reactionsByComment[commentId] || [];
    const mine = existing.find((r) => r.emoji === emoji && r.userName === userName);
    if (mine && mine.id) {
      // Optimistic removal
      setReactionsByComment((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((r) => r.id !== mine.id),
      }));
      await deleteReaction(mine.id);
    } else {
      const optimistic: Reaction = {
        id: `optimistic-${Math.random().toString(36).slice(2)}`,
        entryId: GLOBAL_ENTRY_ID,
        commentId,
        emoji,
        userName,
        createdAt: new Date().toISOString(),
      };
      setReactionsByComment((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), optimistic],
      }));
      await addReaction({
        entryId: GLOBAL_ENTRY_ID,
        commentId,
        emoji,
        userName,
        createdAt: new Date().toISOString(),
      });
    }
    // Refresh from server for canonical state
    const fresh = await getCommentReactions(commentId);
    setReactionsByComment((prev) => ({ ...prev, [commentId]: fresh }));
    setMsgPickerFor(null);
  };

  const gifAvailable = giphyConfigured();

  return (
    <section className="community-feed" aria-labelledby="community-feed-heading">
      <div className="community-feed-header">
        <h2 id="community-feed-heading" className="community-feed-title">
          Community
        </h2>
        <p className="community-feed-sub">
          Oldest messages at the top, newest at the bottom. Trash talk welcome.
        </p>
      </div>

      <div className="community-feed-card">
        <div className="community-feed-toolbar">
          <span className="community-feed-count">{messages.length} posts</span>
          <span className="community-feed-live">Updates every few seconds</span>
        </div>

        <div className="community-feed-list" ref={listRef} role="feed">
          {sorted.length === 0 ? (
            <div className="community-feed-empty">
              <p>No posts yet.</p>
              <p className="community-feed-empty-sub">
                {userName ? "Start the conversation below." : "Log in above to say hello."}
              </p>
            </div>
          ) : (
            sorted.map((msg) => {
              const body = msg.text ?? "";
              const isMe = userName && msg.userName === userName;
              const key =
                msg.id ??
                `${msg.createdAt ?? ""}-${msg.userName ?? ""}-${body.slice(0, 12)}`;
              const parts = parseBody(body, userNames, userName);
              const msgReactions = (msg.id && reactionsByComment[msg.id]) || [];
              const grouped = groupReactions(msgReactions, userName);
              const canReact = Boolean(userName && msg.id);
              return (
                <article key={key} className={`community-feed-post ${isMe ? "community-feed-post-me" : ""}`}>
                  <div
                    className="community-feed-avatar"
                    style={avatarStyle(msg.userName)}
                    aria-hidden
                  >
                    {avatarInitial(msg.userName)}
                  </div>
                  <div className="community-feed-post-main">
                    <header className="community-feed-post-meta">
                      <span className="community-feed-author">{msg.userName ?? ""}</span>
                      {isMe && <span className="community-feed-you">you</span>}
                      <span className="community-feed-dot" aria-hidden>
                        ·
                      </span>
                      <time className="community-feed-time" dateTime={msg.createdAt ?? ""}>
                        {timeAgo(msg.createdAt ?? "")}
                      </time>
                    </header>
                    <div className="community-feed-body">
                      {parts.map((p, i) => {
                        if (p.kind === "text") {
                          return <span key={i} className="cf-msg-text">{p.value}</span>;
                        }
                        if (p.kind === "mention") {
                          return (
                            <span
                              key={i}
                              className={`cf-mention ${p.matched ? "cf-mention-me" : ""}`}
                            >
                              @{p.name}
                            </span>
                          );
                        }
                        if (p.kind === "gif") {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={p.url}
                              alt="GIF"
                              className="cf-msg-gif"
                              loading="lazy"
                            />
                          );
                        }
                        // img — thumbnail via Supabase transform, tap to expand
                        return (
                          <button
                            key={i}
                            type="button"
                            className="cf-msg-image-btn"
                            onClick={() => setLightboxUrl(p.url)}
                            aria-label="View full-size image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={chatImageThumbUrl(p.url, 600)}
                              alt="Chat image"
                              className="cf-msg-image"
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>

                    {(grouped.length > 0 || canReact) && (
                      <div className="cf-reactions-bar">
                        {grouped.map((g) => (
                          <button
                            key={g.emoji}
                            type="button"
                            className={`cf-reaction-chip ${g.mine ? "cf-reaction-chip-mine" : ""}`}
                            onClick={() => msg.id && toggleReaction(msg.id, g.emoji)}
                            disabled={!canReact}
                            title={g.mine ? "Remove your reaction" : "React"}
                          >
                            <span className="cf-reaction-emoji">{g.emoji}</span>
                            <span className="cf-reaction-count">{g.count}</span>
                          </button>
                        ))}
                        {canReact && (
                          <div
                            className="cf-reaction-add-wrap"
                            ref={msgPickerFor === msg.id ? msgPickerRef : undefined}
                          >
                            <button
                              type="button"
                              className="cf-reaction-add"
                              aria-expanded={msgPickerFor === msg.id}
                              aria-label="Add a reaction"
                              onClick={() =>
                                setMsgPickerFor((cur) => (cur === msg.id ? null : msg.id!))
                              }
                            >
                              <span className="cf-reaction-add-icon" aria-hidden>
                                +
                              </span>
                            </button>
                            {msgPickerFor === msg.id && (
                              <div className="cf-reaction-picker" role="dialog" aria-label="Pick a reaction">
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="cf-reaction-picker-item"
                                    onClick={() => msg.id && toggleReaction(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {userName ? (
          <div className="community-feed-compose">
            <label htmlFor="community-feed-input" className="community-feed-sr-only">
              Write a post
            </label>
            <div className="cf-textarea-wrap">
              <textarea
                ref={textareaRef}
                id="community-feed-input"
                className="community-feed-textarea"
                placeholder="Share a take, reaction, or trash talk… (type @ to mention)"
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleTextKeyDown}
                maxLength={MAX_LEN}
                rows={3}
              />
              {mentionOpen && mentionResults.length > 0 && (
                <div className="cf-mention-popover" role="listbox" aria-label="Mention a user">
                  {mentionResults.map((name, i) => (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={i === mentionIndex}
                      className={`cf-mention-item ${i === mentionIndex ? "cf-mention-item-active" : ""}`}
                      onMouseEnter={() => setMentionIndex(i)}
                      onMouseDown={(e) => {
                        // Prevent textarea blur so selection works
                        e.preventDefault();
                        insertMention(name);
                      }}
                    >
                      <span className="cf-mention-avatar" style={avatarStyle(name)} aria-hidden>
                        {avatarInitial(name)}
                      </span>
                      <span className="cf-mention-name">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="community-feed-compose-footer">
              <div className="community-feed-compose-left" ref={composerEmojiRef}>
                <button
                  type="button"
                  className="community-feed-emoji-trigger"
                  onClick={() => {
                    setComposerEmojiOpen((o) => !o);
                    setGifOpen(false);
                  }}
                  aria-expanded={composerEmojiOpen}
                  aria-haspopup="dialog"
                  aria-controls="community-emoji-picker"
                  title="Add emoji"
                >
                  <span className="community-feed-sr-only">Open emoji picker</span>
                  <svg
                    className="community-feed-emoji-trigger-icon"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </button>
                {composerEmojiOpen && (
                  <div
                    id="community-emoji-picker"
                    className="community-feed-emoji-popover"
                    role="dialog"
                    aria-label="Choose an emoji"
                  >
                    <div className="community-feed-emoji-popover-grid">
                      {PICKER_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="community-feed-emoji-popover-item"
                          onClick={() => insertEmoji(emoji)}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {gifAvailable && (
                <div className="cf-gif-wrap" ref={composerGifRef}>
                  <button
                    type="button"
                    className="cf-gif-trigger"
                    onClick={() => {
                      setGifOpen((o) => !o);
                      setComposerEmojiOpen(false);
                    }}
                    aria-expanded={gifOpen}
                    aria-haspopup="dialog"
                    title="Add GIF"
                  >
                    GIF
                  </button>
                  {gifOpen && (
                    <>
                      <div className="cf-gif-backdrop" onClick={() => setGifOpen(false)} />
                      <div className="cf-gif-popover" role="dialog" aria-label="Pick a GIF">
                        <div className="cf-gif-popover-header">
                          <span className="cf-gif-popover-title">Pick a GIF</span>
                          <button
                            type="button"
                            className="cf-gif-popover-close"
                            onClick={() => setGifOpen(false)}
                            aria-label="Close GIF picker"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          className="cf-gif-search"
                          placeholder="Search GIFs…"
                          value={gifQuery}
                          onChange={(e) => setGifQuery(e.target.value)}
                          autoFocus
                        />
                        <div className="cf-gif-grid" aria-busy={gifLoading}>
                          {gifLoading && gifResults.length === 0 ? (
                            <div className="cf-gif-loading">Loading…</div>
                          ) : gifResults.length === 0 ? (
                            <div className="cf-gif-empty">No GIFs found.</div>
                          ) : (
                            gifResults.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                className="cf-gif-item"
                                onClick={() => insertGif(g)}
                                title={g.title}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={g.previewUrl} alt={g.title} loading="lazy" />
                              </button>
                            ))
                          )}
                        </div>
                        <div className="cf-gif-powered">Powered by GIPHY</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Image picker (native file input) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="cf-image-input"
                aria-label="Upload image"
              />
              <button
                type="button"
                className="cf-image-trigger"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Add image"
                aria-label="Add image"
              >
                {uploading ? (
                  <span className="cf-image-trigger-spinner" aria-hidden>…</span>
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </button>

              <div className="community-feed-compose-spacer" aria-hidden />
              <span className="community-feed-char">{text.length}/{MAX_LEN}</span>
              <button
                type="button"
                className="btn btn-primary community-feed-post-btn"
                onClick={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? "Posting…" : "Post"}
              </button>
            </div>
            {uploadError && (
              <div className="cf-upload-error" role="alert">{uploadError}</div>
            )}
            {uploading && (
              <div className="cf-upload-status">Uploading image…</div>
            )}
          </div>
        ) : (
          <div className="community-feed-locked">
            <p>Log in with your email above to join the conversation.</p>
          </div>
        )}
      </div>

      {/* Lightbox for tap-to-expand chat images */}
      {lightboxUrl && (
        <div
          className="cf-lightbox"
          role="dialog"
          aria-label="Full-size image"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="cf-lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(null);
            }}
            aria-label="Close"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full-size"
            className="cf-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
