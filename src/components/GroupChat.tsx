"use client";

import { useState, useEffect, useRef } from "react";
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
  const [messages, setMessages] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const loadMessages = async () => {
    const comments = await getComments(GLOBAL_ENTRY_ID);
    setMessages(comments);
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

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
    setSending(false);
  };

  return (
    <div className="gchat">
      <div className="gchat-header">
        <span className="gchat-title">Group Chat</span>
        <span className="gchat-count">{messages.length}</span>
      </div>

      <div className="gchat-messages" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="gchat-empty">No messages yet. Start the trash talk!</div>
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
          &#10148;
        </button>
      </div>
    </div>
  );
}
