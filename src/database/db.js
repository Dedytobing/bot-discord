const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("SQLite connection error:", err);
    return;
  }

  console.log("SQLite database connected");
});

db.serialize(() => {
  db.run(`
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
  `);
});

module.exports = db;