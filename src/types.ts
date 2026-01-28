export interface Kind {
  id: number;
  name: string;
  gruppe: string;
  geburtsdatum?: string;
}

export interface Abwesenheit {
  id: number;
  kind_id: number;
  von_datum: string;
  bis_datum: string;
  grund?: string;
}

export interface AbwesenheitMitKind extends Abwesenheit {
  kind_name: string;
  kind_gruppe: string;
}

export interface TagesAbwesenheit {
  datum: string;
  anzahl: number;
  kinder: AbwesenheitMitKind[];
}
