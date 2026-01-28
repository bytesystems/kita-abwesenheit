import type { Kind, Abwesenheit, AbwesenheitMitKind } from './types';

interface TagesStatistik {
  datum: string;
  anzahl: number;
}

export interface ElectronAPI {
  // Kinder
  getKinder: () => Promise<Kind[]>;
  addKind: (kind: Partial<Kind>) => Promise<number>;
  updateKind: (kind: Kind) => Promise<boolean>;
  deleteKind: (id: number) => Promise<boolean>;
  importKinderCsv: (content: string) => Promise<number>;
  
  // Abwesenheiten
  getAbwesenheitenMonat: (params: { jahr: number; monat: number }) => Promise<AbwesenheitMitKind[]>;
  getAbwesenheitenTag: (datum: string) => Promise<AbwesenheitMitKind[]>;
  addAbwesenheit: (abwesenheit: Partial<Abwesenheit>) => Promise<number>;
  deleteAbwesenheit: (id: number) => Promise<boolean>;
  getStatistikMonat: (params: { jahr: number; monat: number }) => Promise<TagesStatistik[]>;
  
  // Dialog
  openFileDialog: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
