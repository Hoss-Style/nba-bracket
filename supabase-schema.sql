-- ============================================
-- 2026 NBA Bracket Challenge - Supabase Schema
-- ============================================
-- Run this in the Supabase SQL Editor after creating a new project

-- Entries table: stores each player's bracket picks
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  pin TEXT NOT NULL DEFAULT '',
  picks JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Results table: stores actual playoff results (single row, updated by admin)
CREATE TABLE results (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  picks JSONB NOT NULL DEFAULT '{}',
  finals_mvp TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments table: user comments on brackets
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reactions table: emoji reactions on comments
CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL,
  comment_id TEXT,
  emoji TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Policies: public access for all tables (app handles auth via PIN)
CREATE POLICY "Anyone can read entries" ON entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entries" ON entries FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read results" ON results FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert results" ON results FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reactions" ON reactions FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_entries_email ON entries (email);
CREATE INDEX idx_entries_submitted ON entries (submitted_at);
CREATE INDEX idx_comments_entry ON comments (entry_id);
CREATE INDEX idx_reactions_entry ON reactions (entry_id);
CREATE INDEX idx_reactions_comment ON reactions (comment_id);
