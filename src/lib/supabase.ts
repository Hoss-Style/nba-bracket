import { Entry, BracketPicks, Reaction } from "./types";

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

export async function submitEntry(entry: Omit<Entry, "id">): Promise<Entry | null> {
  if (!isConfigured()) {
    // Fallback: save to localStorage for demo mode
    const entries = getLocalEntries();
    const newEntry = { ...entry, id: crypto.randomUUID() };
    entries.push(newEntry);
    localStorage.setItem("bracket_entries", JSON.stringify(entries));
    return newEntry;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      pin: entry.pin,
      picks: entry.picks,
      submitted_at: entry.submittedAt,
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
    picks: row.picks as BracketPicks,
    submittedAt: row.submitted_at,
  }));
}

// ============ GET / UPDATE ENTRY BY EMAIL ============

export async function getEntryByEmail(email: string): Promise<Entry | null> {
  if (!isConfigured()) {
    const entries = getLocalEntries();
    return entries.find((e) => e.email.toLowerCase() === email.toLowerCase()) || null;
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/entries?email=eq.${encodeURIComponent(email)}&limit=1`,
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
    picks: data[0].picks as BracketPicks,
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
    picks: data[0].picks as BracketPicks,
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
      emoji: reaction.emoji,
      user_name: reaction.userName,
      created_at: reaction.createdAt,
    }),
  });
  return res.ok;
}

// ============ LOCAL STORAGE FALLBACK ============

function getLocalEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("bracket_entries");
  return stored ? JSON.parse(stored) : [];
}
