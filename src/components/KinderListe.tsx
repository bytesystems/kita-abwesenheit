import { useState, useEffect } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Edit2,
  Save,
  X,
  Users,
  Search,
} from "lucide-react";
import type { Kind } from "../types";

interface Props {
  onDataChange: () => void;
}

export default function KinderListe({ onDataChange }: Props) {
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [filteredKinder, setFilteredKinder] = useState<Kind[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Kind>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKind, setNewKind] = useState<Partial<Kind>>({
    name: "",
    gruppe: "",
    geburtsdatum: "",
  });

  useEffect(() => {
    loadKinder();
  }, []);

  useEffect(() => {
    const filtered = kinder.filter(
      (k) =>
        k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.gruppe.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredKinder(filtered);
  }, [kinder, searchTerm]);

  const loadKinder = async () => {
    try {
      const result = await window.electronAPI.getKinder();
      setKinder(result);
    } catch (error) {
      console.error("Fehler beim Laden der Kinder:", error);
    }
  };

  const handleAddKind = async () => {
    if (!newKind.name?.trim()) return;

    try {
      await window.electronAPI.addKind({
        name: newKind.name.trim(),
        gruppe: newKind.gruppe?.trim() || "",
        geburtsdatum: newKind.geburtsdatum || undefined,
      });
      setNewKind({ name: "", gruppe: "", geburtsdatum: "" });
      setShowAddForm(false);
      loadKinder();
      onDataChange();
    } catch (error) {
      console.error("Fehler beim Hinzufügen:", error);
    }
  };

  const handleUpdateKind = async (id: number) => {
    if (!editForm.name?.trim()) return;

    try {
      await window.electronAPI.updateKind({
        id,
        name: editForm.name.trim(),
        gruppe: editForm.gruppe?.trim() || "",
        geburtsdatum: editForm.geburtsdatum || undefined,
      });
      setEditingId(null);
      setEditForm({});
      loadKinder();
      onDataChange();
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const handleDeleteKind = async (id: number, name: string) => {
    if (!confirm(`Möchten Sie "${name}" wirklich löschen?`)) return;

    try {
      await window.electronAPI.deleteKind(id);
      loadKinder();
      onDataChange();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  const handleImportCSV = async () => {
    try {
      const content = await window.electronAPI.openFileDialog();
      if (content) {
        const count = await window.electronAPI.importKinderCsv(content);
        alert(`${count} Kinder erfolgreich importiert!`);
        loadKinder();
        onDataChange();
      }
    } catch (error) {
      console.error("Fehler beim CSV-Import:", error);
      alert("Fehler beim Importieren der CSV-Datei");
    }
  };

  const startEditing = (kind: Kind) => {
    setEditingId(kind.id!);
    setEditForm({
      name: kind.name,
      gruppe: kind.gruppe,
      geburtsdatum: kind.geburtsdatum,
    });
  };

  const gruppen = [...new Set(kinder.map((k) => k.gruppe).filter(Boolean))];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Kinderliste ({kinder.length})
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImportCSV}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              CSV Import
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Kind hinzufügen
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Name oder Gruppe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-3">
            Neues Kind hinzufügen
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={newKind.name}
              onChange={(e) => setNewKind({ ...newKind, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Gruppe"
              value={newKind.gruppe}
              onChange={(e) =>
                setNewKind({ ...newKind, gruppe: e.target.value })
              }
              list="gruppen-list"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="gruppen-list">
              {gruppen.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <input
              type="date"
              placeholder="Geburtsdatum"
              value={newKind.geburtsdatum}
              onChange={(e) =>
                setNewKind({ ...newKind, geburtsdatum: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddKind}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Speichern
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKind({ name: "", gruppe: "", geburtsdatum: "" });
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Info */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
        CSV-Format: Name, Gruppe, Geburtsdatum (YYYY-MM-DD) - erste Zeile wird
        als Header übersprungen
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gruppe
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Geburtsdatum
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredKinder.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm
                    ? "Keine Kinder gefunden"
                    : "Noch keine Kinder vorhanden"}
                </td>
              </tr>
            ) : (
              filteredKinder.map((kind) => (
                <tr key={kind.id} className="hover:bg-gray-50">
                  {editingId === kind.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.name || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.gruppe || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, gruppe: e.target.value })
                          }
                          list="gruppen-edit-list"
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                        <datalist id="gruppen-edit-list">
                          {gruppen.map((g) => (
                            <option key={g} value={g} />
                          ))}
                        </datalist>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editForm.geburtsdatum || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              geburtsdatum: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleUpdateKind(kind.id!)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded mr-1"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {kind.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {kind.gruppe || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {kind.geburtsdatum || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEditing(kind)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded mr-1"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteKind(kind.id!, kind.name)
                          }
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
