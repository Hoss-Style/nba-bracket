"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Comment } from "@/lib/types";
import { getComments, addComment } from "@/lib/supabase";

const GLOBAL_ENTRY_ID = "global";
const POLL_INTERVAL = 8000;

interface GroupChatProps {
  userName: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function GroupChat({ userName }: GroupChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastSeenCount = useRef(0);

  const loadMessages = useCallback(async () => {
    const comments = await getComments(GLOBAL_ENTRY_ID);
    setMessages(comments);
    if (!open && comments.length > lastSeenCount.current) {
      setUnread(comments.length - lastSeenCount.current);
    }
  }, [open]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastSeenCount.current = messages.length;
      // Scroll to bottom when opening
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [open, messages.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    setAutoScroll(true);

    await addComment({
      entryId: GLOBAL_ENTRY_ID,
      userName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });

    await loadMessages();
    lastSeenCount.current = messages.length + 1;
    setSending(false);
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        className={`gchat-fab ${open ? "gchat-fab-hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {unread > 0 && <span className="gchat-fab-badge">{unread}</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="gchat-overlay" onClick={() => setOpen(false)}>
          <div className="gchat-panel" onClick={(e) => e.stopPropagation()}>
            <div className="gchat-header">
              <div className="gchat-header-left">
                <span className="gchat-title">Group Chat</span>
                <span className="gchat-count">{messages.length}</span>
              </div>
              <button className="gchat-close" onClick={() => setOpen(false)}>
                &#10005;
              </button>
            </div>

            <div className="gchat-messages" ref={scrollRef} onScroll={handleScroll}>
              {messages.length === 0 ? (
                <div className="gchat-empty">
                  <div className="gchat-empty-icon">💬</div>
                  <div>No messages yet.</div>
                  <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Start the trash talk!</div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userName === userName;
                  return (
                    <div key={msg.id || msg.createdAt} className={`gchat-msg ${isMe ? "gchat-msg-me" : ""}`}>
                      <div className="gchat-msg-header">
                        <span className="gchat-msg-name">{isMe ? "You" : msg.userName}</span>
                        <span className="gchat-msg-time">{timeAgo(msg.createdAt)}</span>
                      </div>
                      <div className="gchat-msg-text">{msg.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="gchat-input-row">
              <input
                type="text"
                className="gchat-input"
                placeholder="Send a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                maxLength={280}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="gchat-send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
