"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Comment } from "@/lib/types";
import { getComments, addComment } from "@/lib/supabase";

const GLOBAL_ENTRY_ID = "global";
const POLL_INTERVAL = 8000;

/** Shown inside the popover when the emoji button is opened */
const PICKER_EMOJIS = [
  "😀", "😂", "🤣", "😅", "😊", "🙌", "👏", "🔥", "💯", "❤️", "🤝", "😤", "🤞", "😬", "👀", "🙏",
  "⛹️", "🏀", "🏆", "🎯", "⚡", "💪", "🍿", "🤯", "😎", "🥳", "😭", "🤔", "👍", "👎", "✨",
] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function avatarInitial(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "?";
}

function avatarStyle(name: string): { background: string; color: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return {
    background: `hsla(${hue}, 45%, 32%, 1)`,
    color: "hsla(0, 0%, 96%, 1)",
  };
}

interface CommunityFeedProps {
  /** When set, user can post; otherwise feed is read-only with a login hint */
  userName?: string | null;
}

export default function CommunityFeed({ userName }: CommunityFeedProps) {
  const [messages, setMessages] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const didInitialScroll = useRef(false);

  const loadMessages = useCallback(async () => {
    const comments = await getComments(GLOBAL_ENTRY_ID);
    setMessages(comments);
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessages]);

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

  useEffect(() => {
    if (!emojiPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const root = emojiPickerRef.current;
      if (root && !root.contains(e.target as Node)) setEmojiPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiPickerOpen]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => (t + emoji).slice(0, 280));
      setEmojiPickerOpen(false);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = text.slice(0, start) + emoji + text.slice(end);
    if (next.length > 280) return;
    setText(next);
    setEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !userName) return;
    setSending(true);
    setText("");
    await addComment({
      entryId: GLOBAL_ENTRY_ID,
      userName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
    await loadMessages();
    setSending(false);
    requestAnimationFrame(() => scrollFeedToBottom());
  };

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
              const isMe = userName && msg.userName === userName;
              const key = msg.id ?? `${msg.createdAt}-${msg.userName}-${msg.text.slice(0, 12)}`;
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
                      <span className="community-feed-author">{msg.userName}</span>
                      {isMe && <span className="community-feed-you">you</span>}
                      <span className="community-feed-dot" aria-hidden>
                        ·
                      </span>
                      <time className="community-feed-time" dateTime={msg.createdAt}>
                        {timeAgo(msg.createdAt)}
                      </time>
                    </header>
                    <p className="community-feed-body">{msg.text}</p>
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
            <textarea
              ref={textareaRef}
              id="community-feed-input"
              className="community-feed-textarea"
              placeholder="Share a take, reaction, or trash talk…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
              rows={2}
            />
            <div className="community-feed-compose-footer">
              <div className="community-feed-compose-left" ref={emojiPickerRef}>
                <button
                  type="button"
                  className="community-feed-emoji-trigger"
                  onClick={() => setEmojiPickerOpen((o) => !o)}
                  aria-expanded={emojiPickerOpen}
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
                {emojiPickerOpen && (
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
              <div className="community-feed-compose-spacer" aria-hidden />
              <span className="community-feed-char">{text.length}/280</span>
              <button
                type="button"
                className="btn btn-primary community-feed-post-btn"
                onClick={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        ) : (
          <div className="community-feed-locked">
            <p>Log in with your email above to join the conversation.</p>
          </div>
        )}
      </div>
    </section>
  );
}
