const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Kinder
  getKinder: () => ipcRenderer.invoke('get-kinder'),
  addKind: (kind) => ipcRenderer.invoke('add-kind', kind),
  updateKind: (kind) => ipcRenderer.invoke('update-kind', kind),
  deleteKind: (id) => ipcRenderer.invoke('delete-kind', id),
  importKinderCsv: (content) => ipcRenderer.invoke('import-kinder-csv', content),
  
  // Abwesenheiten
  getAbwesenheitenMonat: (params) => ipcRenderer.invoke('get-abwesenheiten-monat', params),
  getAbwesenheitenTag: (datum) => ipcRenderer.invoke('get-abwesenheiten-tag', datum),
  addAbwesenheit: (abwesenheit) => ipcRenderer.invoke('add-abwesenheit', abwesenheit),
  deleteAbwesenheit: (id) => ipcRenderer.invoke('delete-abwesenheit', id),
  getStatistikMonat: (params) => ipcRenderer.invoke('get-statistik-monat', params),
  
  // Dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog')
});
