CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  user_chat_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  mute_mode TEXT NOT NULL DEFAULT 'none' CHECK (mute_mode IN ('none', 'partial', 'full')),
  delete_intercept_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON sessions(topic_id);

CREATE TABLE IF NOT EXISTS message_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_message_id INTEGER NOT NULL,
  admin_chat_id INTEGER NOT NULL,
  admin_topic_id INTEGER NOT NULL,
  admin_message_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('user_to_admin', 'admin_to_user')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_mappings_user
  ON message_mappings(session_id, user_message_id);

CREATE INDEX IF NOT EXISTS idx_message_mappings_admin
  ON message_mappings(admin_chat_id, admin_topic_id, admin_message_id);
