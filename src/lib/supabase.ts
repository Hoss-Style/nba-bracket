import { Entry, BracketPicks, Reaction, Comment } from "./types";
import { createEmptyPicks } from "./emptyPicks";

function normalizePicks(raw: unknown): BracketPicks {
  const base = createEmptyPicks();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...base, ...(raw as Partial<BracketPicks>) };
  }
  return base;
}

function normalizeCommentRow(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string | undefined,
    entryId: String(row.entryId ?? row.entry_id ?? ""),
    userName: String(row.userName ?? row.user_name ?? ""),
    text: String(row.text ?? ""),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  };
}

// Supabase configuration - set these in .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const isConfigured = () => SUPABASE_URL && SUPABASE_ANON_KEY;

// ============ ENTRIES ============

/** Normalize an email for storage and lookup — always lowercased, trimmed. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function submitEntry(entry: Omit<Entry, "id">): Promise<Entry | null> {
  const normalized = { ...entry, email: normalizeEmail(entry.email) };
  if (!isConfigured()) {
    // Fallback: save to localStorage for demo mode
    const entries = getLocalEntries();
    const newEntry = { ...normalized, id: crypto.randomUUID() };
    entries.push(newEntry);
    localStorage.setItem("bracket_entries", JSON.stringify(entries));
    return newEntry;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      pin: normalized.pin,
      picks: normalized.picks,
      submitted_at: normalized.submittedAt,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

export async function getAllEntries(): Promise<Entry[]> {
  if (!isConfigured()) {
    return getLocalEntries();
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?select=*&order=submitted_at.asc`, {
    headers,
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    pin: row.pin || "",
    picks: normalizePicks(row.picks),
    submittedAt: row.submitted_at,
  }));
}

// ============ GET / UPDATE ENTRY BY EMAIL ============

export async function getEntryByEmail(email: string): Promise<Entry | null> {
  const normalized = normalizeEmail(email);
  if (!isConfigured()) {
    const entries = getLocalEntries();
    return entries.find((e) => e.email.toLowerCase() === normalized) || null;
  }

  // Use ilike for case-insensitive match so mixed-case emails saved before
  // the normalization fix are still findable. Escape _ and % so emails with
  // underscores (e.g. john_doe@gmail.com) match exactly.
  const escaped = normalized.replace(/[\\%_]/g, (m) => "\\" + m);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/entries?email=ilike.${encodeURIComponent(escaped)}&limit=1`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length === 0) return null;
  return {
    id: data[0].id,
    name: data[0].name,
    email: data[0].email,
    phone: data[0].phone || "",
    pin: data[0].pin || "",
    picks: normalizePicks(data[0].picks),
    submittedAt: data[0].submitted_at,
  };
}

export async function getEntryById(id: string): Promise<Entry | null> {
  if (!isConfigured()) {
    const entries = getLocalEntries();
    return entries.find((e) => e.id === id) || null;
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/entries?id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length === 0) return null;
  return {
    id: data[0].id,
    name: data[0].name,
    email: data[0].email,
    phone: data[0].phone || "",
    pin: data[0].pin || "",
    picks: normalizePicks(data[0].picks),
    submittedAt: data[0].submitted_at,
  };
}

export async function updateEntry(entry: Entry): Promise<boolean> {
  if (!isConfigured()) {
    const entries = getLocalEntries();
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx === -1) return false;
    entries[idx] = entry;
    localStorage.setItem("bracket_entries", JSON.stringify(entries));
    return true;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?id=eq.${entry.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      picks: entry.picks,
      pin: entry.pin,
      submitted_at: entry.submittedAt,
    }),
  });
  return res.ok;
}

// ============ ACTUAL RESULTS ============

export async function getActualResults(): Promise<{ picks: BracketPicks; finalsMVP: string } | null> {
  if (!isConfigured()) {
    const stored = localStorage.getItem("bracket_results");
    return stored ? JSON.parse(stored) : null;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/results?select=*&limit=1`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length === 0) return null;
  return { picks: data[0].picks, finalsMVP: data[0].finals_mvp };
}

export async function saveActualResults(picks: BracketPicks, finalsMVP: string): Promise<boolean> {
  if (!isConfigured()) {
    localStorage.setItem("bracket_results", JSON.stringify({ picks, finalsMVP }));
    return true;
  }

  // Upsert - always update the single results row
  const res = await fetch(`${SUPABASE_URL}/rest/v1/results?id=eq.1`, {
    method: "PUT",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ id: 1, picks, finals_mvp: finalsMVP }),
  });

  // If PUT failed (no existing row), try POST
  if (!res.ok) {
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/results`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: 1, picks, finals_mvp: finalsMVP }),
    });
    return postRes.ok;
  }
  return true;
}

// ============ REACTIONS ============

export async function getReactions(entryId: string): Promise<Reaction[]> {
  if (!isConfigured()) {
    const stored = localStorage.getItem("bracket_reactions");
    const all: Reaction[] = stored ? JSON.parse(stored) : [];
    return all.filter((r) => r.entryId === entryId);
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reactions?entry_id=eq.${encodeURIComponent(entryId)}&order=created_at.desc`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((row: Record<string, unknown>) => ({
    id: row.id,
    entryId: row.entry_id,
    commentId: row.comment_id,
    emoji: row.emoji,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export async function getCommentReactions(commentId: string): Promise<Reaction[]> {
  if (!isConfigured()) {
    const stored = localStorage.getItem("bracket_reactions");
    const all: Reaction[] = stored ? JSON.parse(stored) : [];
    return all.filter((r) => r.commentId === commentId);
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reactions?comment_id=eq.${encodeURIComponent(commentId)}&order=created_at.desc`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((row: Record<string, unknown>) => ({
    id: row.id,
    entryId: row.entry_id,
    commentId: row.comment_id,
    emoji: row.emoji,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export async function addReaction(reaction: Omit<Reaction, "id">): Promise<boolean> {
  if (!isConfigured()) {
    const stored = localStorage.getItem("bracket_reactions");
    const all: Reaction[] = stored ? JSON.parse(stored) : [];
    all.push({ ...reaction, id: crypto.randomUUID() });
    localStorage.setItem("bracket_reactions", JSON.stringify(all));
    return true;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/reactions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entry_id: reaction.entryId,
      comment_id: reaction.commentId,
      emoji: reaction.emoji,
      user_name: reaction.userName,
      created_at: reaction.createdAt,
    }),
  });
  return res.ok;
}

export async function deleteReaction(id: string): Promise<boolean> {
  if (!isConfigured()) {
    const stored = localStorage.getItem("bracket_reactions");
    const all: Reaction[] = stored ? JSON.parse(stored) : [];
    const next = all.filter((r) => r.id !== id);
    localStorage.setItem("bracket_reactions", JSON.stringify(next));
    return true;
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reactions?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers }
  );
  return res.ok;
}

// ============ COMMENTS ============

export async function getComments(entryId: string): Promise<Comment[]> {
  if (!isConfigured()) {
    try {
      const stored = localStorage.getItem("bracket_comments");
      if (!stored) return [];
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((r) => {
        if (!r || typeof r !== "object") return [];
        const c = normalizeCommentRow(r as Record<string, unknown>);
        return c.entryId === entryId ? [c] : [];
      });
    } catch {
      return [];
    }
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?entry_id=eq.${encodeURIComponent(entryId)}&order=created_at.asc`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((row: Record<string, unknown>) => normalizeCommentRow(row));
}

export async function addComment(comment: Omit<Comment, "id">): Promise<boolean> {
  if (!isConfigured()) {
    try {
      const stored = localStorage.getItem("bracket_comments");
      let all: Comment[] = [];
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          all = parsed.flatMap((r) => {
            if (!r || typeof r !== "object") return [];
            return [normalizeCommentRow(r as Record<string, unknown>)];
          });
        }
      }
      all.push({ ...comment, id: crypto.randomUUID() });
      localStorage.setItem("bracket_comments", JSON.stringify(all));
      return true;
    } catch {
      return false;
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entry_id: comment.entryId,
      user_name: comment.userName,
      text: comment.text,
      created_at: comment.createdAt,
    }),
  });
  return res.ok;
}

// ============ LOCAL STORAGE FALLBACK ============

function getLocalEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("bracket_entries");
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: Record<string, unknown>) => ({
      id: row.id as string | undefined,
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      pin: String(row.pin ?? ""),
      picks: normalizePicks(row.picks),
      submittedAt: String(row.submitted_at ?? row.submittedAt ?? ""),
    }));
  } catch {
    return [];
  }
}

// ============ CHAT IMAGE UPLOADS ============

const CHAT_IMAGES_BUCKET = "chat-images";

/** Upload a compressed image blob to Supabase Storage, return its public URL. */
export async function uploadChatImage(file: Blob, userName: string): Promise<string | null> {
  if (!isConfigured()) return null;

  // Build a filename: userName/timestamp-random.ext
  const ext = file.type.split("/")[1] || "jpg";
  const safeName = userName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "user";
  const filename = `${safeName}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadHeaders: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": file.type || "image/jpeg",
    "x-upsert": "false",
  };

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${CHAT_IMAGES_BUCKET}/${encodeURI(filename)}`,
    { method: "POST", headers: uploadHeaders, body: file }
  );
  if (!res.ok) {
    console.error("Chat image upload failed:", res.status, await res.text());
    return null;
  }

  // Public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${CHAT_IMAGES_BUCKET}/${encodeURI(filename)}`;
}

/** Generate a thumbnail URL using Supabase's image transform API. */
export function chatImageThumbUrl(url: string, width: number = 600): string {
  if (!url.includes("/storage/v1/object/public/")) return url;
  // Supabase transform endpoint: /storage/v1/render/image/public/<bucket>/<path>
  const transformUrl = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  return `${transformUrl}?width=${width}&quality=75&resize=contain`;
}
