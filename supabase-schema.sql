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

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Policies: allow public read + insert for entries, public read for results
CREATE POLICY "Anyone can read entries" ON entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entries" ON entries FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read results" ON results FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert results" ON results FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_entries_email ON entries (email);
CREATE INDEX idx_entries_submitted ON entries (submitted_at);
