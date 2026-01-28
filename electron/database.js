import initSqlJs from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let dbPath = null;

export async function initDatabase() {
  // WASM-Pfad finden
  let wasmPath;
  if (app.isPackaged) {
    wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm');
  } else {
    wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  }
  
  // SQL.js initialisieren
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });
  
  // Datenbank-Pfad im User-Verzeichnis
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  dbPath = path.join(userDataPath, 'kita_abwesenheit.db');
  console.log('Datenbank-Pfad:', dbPath);
  
  // Existierende Datenbank laden oder neue erstellen
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Tabellen erstellen
  db.run(`
    CREATE TABLE IF NOT EXISTS kinder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gruppe TEXT NOT NULL DEFAULT '',
      geburtsdatum TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS abwesenheiten (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind_id INTEGER NOT NULL,
      von_datum TEXT NOT NULL,
      bis_datum TEXT NOT NULL,
      grund TEXT,
      FOREIGN KEY (kind_id) REFERENCES kinder(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_abwesenheiten_datum 
    ON abwesenheiten(von_datum, bis_datum)
  `);
  
  // Datenbank speichern
  saveDatabase();
  
  return db;
}

export function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }
  return db;
}

// Hilfsfunktion um Ergebnisse als Array von Objekten zu bekommen
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function runSql(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return db.getRowsModified();
}

export function getLastInsertId() {
  const result = queryOne('SELECT last_insert_rowid() as id');
  return result ? result.id : 0;
}
