-- 0001_initial.sql
-- Initial schema for AngelRaise v2 P0 #4 (D1 persistence).
-- All money values are INTEGER cents. Timestamps are INTEGER unix milliseconds.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  goal_amount INTEGER NOT NULL CHECK (goal_amount >= 0),
  raised_amount INTEGER NOT NULL DEFAULT 0 CHECK (raised_amount >= 0),
  cost_per_view INTEGER NOT NULL CHECK (cost_per_view >= 0),
  total_ad_views INTEGER NOT NULL DEFAULT 0 CHECK (total_ad_views >= 0),
  host_name TEXT NOT NULL,
  host_description TEXT NOT NULL,
  host_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

CREATE TABLE ad_views (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  user_id TEXT REFERENCES users(id),
  anon_session_id TEXT,
  ad_title TEXT NOT NULL,
  amount_credited INTEGER NOT NULL CHECK (amount_credited >= 0),
  viewed_at INTEGER NOT NULL,
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

CREATE INDEX idx_ad_views_campaign ON ad_views(campaign_id);
CREATE INDEX idx_ad_views_user ON ad_views(user_id);
CREATE INDEX idx_ad_views_anon ON ad_views(anon_session_id);
