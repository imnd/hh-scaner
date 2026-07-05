const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.configure('busyTimeout', 5000);
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Vacancies table
    db.run(`
      CREATE TABLE IF NOT EXISTS vacancies (
        id TEXT PRIMARY KEY,
        title TEXT,
        link TEXT,
        company TEXT,
        salary TEXT,
        description TEXT,
        contacts TEXT,
        letter TEXT,
        published_at TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add letter column for existing databases (fails silently if exists)
    db.run("ALTER TABLE vacancies ADD COLUMN letter TEXT", () => {});
    
    // Add published_at column for existing databases
    db.run("ALTER TABLE vacancies ADD COLUMN published_at TEXT", () => {});

    // Settings table (for resume text and configs)
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Migrate resume from file if empty and file exists
    db.get('SELECT value FROM settings WHERE key = ?', ['resume'], (err, row) => {
      if (!err && !row) {
        const resumePath = path.resolve(__dirname, 'resume.txt');
        if (fs.existsSync(resumePath)) {
          const content = fs.readFileSync(resumePath, 'utf-8');
          db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['resume', content]);
        }
      }
    });
  });
}

// Promisified DB helpers
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

module.exports = {
  db,
  all,
  get,
  run
};
