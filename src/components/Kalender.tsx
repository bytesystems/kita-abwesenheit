import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  getDay,
  addMonths,
  subMonths,
  isWeekend,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import type { Kind, AbwesenheitMitKind } from "../types";
import DatePicker from "./DatePicker";

interface Props {
  onDataChange: () => void;
}

interface TagesStatistik {
  datum: string;
  anzahl: number;
}

type ZeitraumTyp = "einzeln" | "bereich";

export default function Kalender({ onDataChange }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statistik, setStatistik] = useState<TagesStatistik[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tagesAbwesenheiten, setTagesAbwesenheiten] = useState<AbwesenheitMitKind[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [kinder, setKinder] = useState<Kind[]>([]);
  
  // Neuer State für den verbesserten Dialog
  const [zeitraumTyp, setZeitraumTyp] = useState<ZeitraumTyp>("einzeln");
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [pickerEndDate, setPickerEndDate] = useState<Date>(new Date());
  const [selectedKindId, setSelectedKindId] = useState<number>(0);
  const [grund, setGrund] = useState<string>("");

  const jahr = currentDate.getFullYear();
  const monat = currentDate.getMonth() + 1;

  useEffect(() => {
    loadData();
  }, [jahr, monat]);

  useEffect(() => {
    if (selectedDate) {
      loadTagesAbwesenheiten(selectedDate);
    }
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [stat, kinderList] = await Promise.all([
        window.electronAPI.getStatistikMonat({ jahr, monat }),
        window.electronAPI.getKinder(),
      ]);
      setStatistik(stat);
      setKinder(kinderList);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
  };

  const loadTagesAbwesenheiten = async (datum: string) => {
    try {
      const result = await window.electronAPI.getAbwesenheitenTag(datum);
      setTagesAbwesenheiten(result);
    } catch (error) {
      console.error("Fehler beim Laden der Tagesabwesenheiten:", error);
    }
  };

  const handleAddAbwesenheit = async () => {
    if (!selectedKindId || !pickerDate) return;

    try {
      const vonDatum = format(pickerDate, "yyyy-MM-dd");
      const bisDatum = zeitraumTyp === "bereich" 
        ? format(pickerEndDate, "yyyy-MM-dd")
        : vonDatum;

      await window.electronAPI.addAbwesenheit({
        kind_id: selectedKindId,
        von_datum: vonDatum,
        bis_datum: bisDatum,
        grund: grund || undefined,
      });
      
      closeDialog();
      loadData();
      if (selectedDate) {
        loadTagesAbwesenheiten(selectedDate);
      }
      onDataChange();
    } catch (error) {
      console.error("Fehler beim Hinzufügen:", error);
    }
  };

  const handleDeleteAbwesenheit = async (id: number) => {
    if (!confirm("Abwesenheit wirklich löschen?")) return;

    try {
      await window.electronAPI.deleteAbwesenheit(id);
      loadData();
      if (selectedDate) {
        loadTagesAbwesenheiten(selectedDate);
      }
      onDataChange();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  const getAnzahlForDate = (dateStr: string): number => {
    const stat = statistik.find((s) => s.datum === dateStr);
    return stat?.anzahl || 0;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Titel
    const monatName = format(currentDate, "MMMM yyyy", { locale: de });
    doc.setFontSize(18);
    doc.text(`Abwesenheiten ${monatName}`, 14, 20);
    
    // Zusammenfassung
    const tageAbwesend = statistik.filter((s) => s.anzahl > 0).length;
    const gesamtAbwesend = statistik.reduce((sum, s) => sum + s.anzahl, 0);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tage mit Abwesenheiten: ${tageAbwesend} | Gesamt: ${gesamtAbwesend} Abwesenheitstage`, 14, 28);
    
    // Tabelle
    const tableData = statistik.map((s) => {
      const date = parseISO(s.datum);
      const wochentag = format(date, "EEE", { locale: de });
      const datumFormatiert = format(date, "dd.MM.yyyy");
      return [wochentag, datumFormatiert, s.anzahl.toString()];
    });
    
    autoTable(doc, {
      startY: 35,
      head: [["Tag", "Datum", "Abwesend"]],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25, halign: "center" },
      },
      didParseCell: (data) => {
        // Zeilen mit Abwesenheiten hervorheben
        if (data.section === "body" && data.column.index === 2) {
          const anzahl = parseInt(data.cell.raw as string);
          if (anzahl > 0) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Erstellt am ${format(new Date(), "dd.MM.yyyy HH:mm")}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Speichern
    doc.save(`Abwesenheiten_${format(currentDate, "yyyy-MM")}.pdf`);
  };

  // Kalender-Tage generieren
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leere Tage am Anfang (Montag = 0)
  const startDay = getDay(monthStart);
  const emptyDays = startDay === 0 ? 6 : startDay - 1;

  const openAddDialog = (datum?: string) => {
    const initialDate = datum ? parseISO(datum) : new Date();
    setPickerDate(initialDate);
    setPickerEndDate(initialDate);
    setSelectedKindId(0);
    setGrund("");
    setZeitraumTyp("einzeln");
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setSelectedKindId(0);
    setGrund("");
  };

  return (
    <div className="flex gap-6">
      {/* Kalender */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Kalender Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {format(currentDate, "MMMM yyyy", { locale: de })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Wochentage Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-medium text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Kalender Grid */}
        <div className="grid grid-cols-7">
          {/* Leere Tage */}
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square bg-gray-50" />
          ))}

          {/* Tage */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const anzahl = getAnzahlForDate(dateStr);
            const isSelected = selectedDate === dateStr;
            const weekend = isWeekend(day);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  aspect-square p-2 border-b border-r border-gray-100 cursor-pointer
                  transition-colors relative
                  ${weekend ? "bg-gray-50" : "bg-white"}
                  ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""}
                  ${anzahl > 0 ? "bg-red-50" : ""}
                  hover:bg-blue-50
                `}
              >
                <div
                  className={`
                    text-sm font-medium
                    ${isToday(day) ? "bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center" : ""}
                    ${weekend && !isToday(day) ? "text-gray-400" : "text-gray-700"}
                  `}
                >
                  {format(day, "d")}
                </div>
                {anzahl > 0 && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {anzahl}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legende */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-50 border border-red-200 rounded" />
            <span>Abwesenheiten</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            <span>Heute</span>
          </div>
        </div>
      </div>

      {/* Seitenleiste */}
      <div className="w-80 space-y-4">
        {/* Abwesenheit hinzufügen Button */}
        <button
          onClick={() => openAddDialog(selectedDate || undefined)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Abwesenheit eintragen
        </button>

        {/* Tagesdetails */}
        {selectedDate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {format(parseISO(selectedDate), "EEEE", { locale: de })}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(parseISO(selectedDate), "d. MMMM yyyy", { locale: de })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4">
              {tagesAbwesenheiten.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Keine Abwesenheiten an diesem Tag
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 mb-3">
                    {tagesAbwesenheiten.length} Kind
                    {tagesAbwesenheiten.length !== 1 ? "er" : ""} abwesend:
                  </p>
                  {tagesAbwesenheiten.map((abw) => (
                    <div
                      key={abw.id}
                      className="flex items-start justify-between p-2 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {abw.kind_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {abw.kind_gruppe && `${abw.kind_gruppe} • `}
                          {abw.von_datum === abw.bis_datum
                            ? format(parseISO(abw.von_datum), "d.M.yyyy")
                            : `${format(parseISO(abw.von_datum), "d.M.")} - ${format(parseISO(abw.bis_datum), "d.M.yyyy")}`}
                        </p>
                        {abw.grund && (
                          <p className="text-xs text-gray-400 mt-1">
                            {abw.grund}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAbwesenheit(abw.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monatsübersicht */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Monatsübersicht
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tage mit Abwesenheiten:</span>
              <span className="font-medium">
                {statistik.filter((s) => s.anzahl > 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gesamt Abwesenheitstage:</span>
              <span className="font-medium">
                {statistik.reduce((sum, s) => sum + s.anzahl, 0)}
              </span>
            </div>
          </div>
          
          {/* PDF Export Button */}
          <button
            onClick={exportPDF}
            className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <FileDown className="w-4 h-4" />
            PDF Export
          </button>
        </div>
      </div>

      {/* Kompakter Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden">
            {/* Dialog Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Abwesenheit eintragen
              </h3>
              <button
                onClick={closeDialog}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 space-y-3">
              {/* Kind auswählen */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Kind
                </label>
                <select
                  value={selectedKindId}
                  onChange={(e) => setSelectedKindId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-gray-900"
                >
                  <option value={0}>Kind auswählen...</option>
                  {kinder.map((kind) => (
                    <option key={kind.id} value={kind.id!}>
                      {kind.name}
                      {kind.gruppe ? ` (${kind.gruppe})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zeitraum Typ Toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Zeitraum
                </label>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZeitraumTyp("einzeln")}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      zeitraumTyp === "einzeln"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    Einzelner Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setZeitraumTyp("bereich")}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      zeitraumTyp === "bereich"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    Zeitraum
                  </button>
                </div>
              </div>

              {/* Datum Picker */}
              <DatePicker
                selectedDate={pickerDate}
                selectedEndDate={zeitraumTyp === "bereich" ? pickerEndDate : null}
                onChange={(date) => {
                  setPickerDate(date);
                  if (zeitraumTyp === "einzeln") {
                    setPickerEndDate(date);
                  }
                }}
                onEndDateChange={setPickerEndDate}
                isRange={zeitraumTyp === "bereich"}
              />

              {/* Grund */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grund <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={grund}
                  onChange={(e) => setGrund(e.target.value)}
                  placeholder="z.B. Urlaub, Krankheit..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={closeDialog}
                className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddAbwesenheit}
                disabled={!selectedKindId}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
