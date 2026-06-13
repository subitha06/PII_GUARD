const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./app.db");

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// Data table (encrypted storage)
db.run(`
  CREATE TABLE IF NOT EXISTS data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    encryptedText TEXT
  )
`);

module.exports = db;