import { useState } from "react";
import { Calendar, Users } from "lucide-react";
import KinderListe from "./components/KinderListe";
import Kalender from "./components/Kalender";

type Tab = "kalender" | "kinder";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("kalender");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-800">
              Kita Abwesenheit
            </h1>
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab("kalender")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "kalender"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Kalender
              </button>
              <button
                onClick={() => setActiveTab("kinder")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "kinder"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Kinder
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "kalender" ? (
          <Kalender key={refreshKey} onDataChange={handleDataChange} />
        ) : (
          <KinderListe onDataChange={handleDataChange} />
        )}
      </main>
    </div>
  );
}

export default App;
