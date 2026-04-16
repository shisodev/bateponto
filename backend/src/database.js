const { Database: RawDatabase } = require('node-sqlite3-wasm');
const bcrypt = require('bcryptjs');
const path = require('path');

// Wrapper de compatibilidade com a API do better-sqlite3
// node-sqlite3-wasm usa arrays de parâmetros; o wrapper converte spread args -> array
class PreparedStatement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  _params(args) {
    if (args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args;
  }

  run(...args) {
    return this._db.run(this._sql, this._params(args));
  }

  get(...args) {
    return this._db.get(this._sql, this._params(args));
  }

  all(...args) {
    return this._db.all(this._sql, this._params(args));
  }
}

class Database {
  constructor(filePath) {
    this._raw = new RawDatabase(filePath);
  }

  pragma(str) {
    this._raw.run(`PRAGMA ${str}`);
  }

  // Executa SQL com múltiplos statements separados por ;
  exec(sql) {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      this._raw.run(stmt);
    }
  }

  run(sql, params = []) {
    return this._raw.run(sql, params);
  }

  get(sql, params = []) {
    return this._raw.get(sql, params);
  }

  all(sql, params = []) {
    return this._raw.all(sql, params);
  }

  prepare(sql) {
    return new PreparedStatement(this._raw, sql);
  }
}

const dbPath = path.join(__dirname, '..', 'bateponto.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
)`);

db.run(`CREATE TABLE IF NOT EXISTS work_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'fixed',
  monday_start TEXT, monday_end TEXT,
  tuesday_start TEXT, tuesday_end TEXT,
  wednesday_start TEXT, wednesday_end TEXT,
  thursday_start TEXT, thursday_end TEXT,
  friday_start TEXT, friday_end TEXT,
  saturday_start TEXT, saturday_end TEXT,
  sunday_start TEXT, sunday_end TEXT,
  break_duration INTEGER DEFAULT 60,
  weekly_hours INTEGER DEFAULT 44,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS time_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  is_adjusted INTEGER DEFAULT 0,
  original_timestamp TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS adjustment_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  record_id INTEGER,
  request_type TEXT NOT NULL DEFAULT 'correction',
  original_timestamp TEXT,
  requested_timestamp TEXT NOT NULL,
  record_type TEXT NOT NULL,
  date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
)`);

db.run(`CREATE TABLE IF NOT EXISTS daily_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_start TEXT,
  break_end TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
)`);

// Cria o administrador padrão se não existir
const adminExists = db.get('SELECT id FROM users WHERE username = ?', ['admin']);
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
    ['admin', hashedPassword, 'Administrador', 'admin']
  );
  console.log('✅ Usuário admin criado: admin / admin123');
}

module.exports = db;
