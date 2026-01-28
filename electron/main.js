// Prevents additional console window on Windows in release
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, queryAll, queryOne, runSql, getLastInsertId, saveDatabase } from './database.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
  // Datenbank initialisieren
  await initDatabase();
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 750,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Kita Abwesenheit',
    autoHideMenuBar: true
  });

  // In Entwicklung: Vite Dev Server
  // In Produktion: gebaute Dateien
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:1420');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// === IPC Handler für Kinder ===

ipcMain.handle('get-kinder', async () => {
  return queryAll(`
    SELECT id, name, gruppe, geburtsdatum 
    FROM kinder 
    ORDER BY gruppe, name
  `);
});

ipcMain.handle('add-kind', async (event, kind) => {
  runSql(`
    INSERT INTO kinder (name, gruppe, geburtsdatum) 
    VALUES (?, ?, ?)
  `, [kind.name, kind.gruppe || '', kind.geburtsdatum || null]);
  return getLastInsertId();
});

ipcMain.handle('update-kind', async (event, kind) => {
  runSql(`
    UPDATE kinder 
    SET name = ?, gruppe = ?, geburtsdatum = ? 
    WHERE id = ?
  `, [kind.name, kind.gruppe || '', kind.geburtsdatum || null, kind.id]);
  return true;
});

ipcMain.handle('delete-kind', async (event, id) => {
  runSql('DELETE FROM abwesenheiten WHERE kind_id = ?', [id]);
  runSql('DELETE FROM kinder WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('import-kinder-csv', async (event, csvContent) => {
  let count = 0;
  
  const lines = csvContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Header überspringen
    if (i === 0) continue;
    
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(/[,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
    const name = parts[0] || '';
    const gruppe = parts[1] || '';
    const geburtsdatum = parts[2] || null;
    
    if (!name) continue;
    
    runSql(`
      INSERT INTO kinder (name, gruppe, geburtsdatum) 
      VALUES (?, ?, ?)
    `, [name, gruppe, geburtsdatum]);
    count++;
  }
  
  return count;
});

// === IPC Handler für Abwesenheiten ===

ipcMain.handle('get-abwesenheiten-monat', async (event, { jahr, monat }) => {
  const monatStart = `${jahr}-${String(monat).padStart(2, '0')}-01`;
  const monatEnde = `${jahr}-${String(monat).padStart(2, '0')}-31`;
  
  return queryAll(`
    SELECT a.id, a.kind_id, a.von_datum, a.bis_datum, a.grund, k.name as kind_name, k.gruppe as kind_gruppe
    FROM abwesenheiten a
    JOIN kinder k ON a.kind_id = k.id
    WHERE a.von_datum <= ? AND a.bis_datum >= ?
    ORDER BY a.von_datum, k.name
  `, [monatEnde, monatStart]);
});

ipcMain.handle('get-abwesenheiten-tag', async (event, datum) => {
  return queryAll(`
    SELECT a.id, a.kind_id, a.von_datum, a.bis_datum, a.grund, k.name as kind_name, k.gruppe as kind_gruppe
    FROM abwesenheiten a
    JOIN kinder k ON a.kind_id = k.id
    WHERE a.von_datum <= ? AND a.bis_datum >= ?
    ORDER BY k.gruppe, k.name
  `, [datum, datum]);
});

ipcMain.handle('add-abwesenheit', async (event, abwesenheit) => {
  runSql(`
    INSERT INTO abwesenheiten (kind_id, von_datum, bis_datum, grund) 
    VALUES (?, ?, ?, ?)
  `, [
    abwesenheit.kind_id,
    abwesenheit.von_datum,
    abwesenheit.bis_datum || abwesenheit.von_datum,
    abwesenheit.grund || null
  ]);
  return getLastInsertId();
});

ipcMain.handle('delete-abwesenheit', async (event, id) => {
  runSql('DELETE FROM abwesenheiten WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('get-statistik-monat', async (event, { jahr, monat }) => {
  const statistik = [];
  
  // Tage im Monat berechnen
  const tageImMonat = new Date(jahr, monat, 0).getDate();
  
  for (let tag = 1; tag <= tageImMonat; tag++) {
    const datum = `${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
    const result = queryOne(`
      SELECT COUNT(*) as anzahl 
      FROM abwesenheiten 
      WHERE von_datum <= ? AND bis_datum >= ?
    `, [datum, datum]);
    
    statistik.push({ datum, anzahl: result ? result.anzahl : 0 });
  }
  
  return statistik;
});

// === Dialog Handler ===

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return content;
  }
  return null;
});
