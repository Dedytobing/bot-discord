const Database = require("better-sqlite3");

const db = new Database("./database.sqlite");

console.log("SQLite database connected");

db.prepare(`
  CREATE TABLE IF NOT EXISTS anti_spam_channels (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    warning_message_id TEXT,
    action TEXT DEFAULT 'timeout',
    action_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

module.exports = db;