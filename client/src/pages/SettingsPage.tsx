import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useSettingsStore } from "@/stores/settingsStore";

export function SettingsPage() {
  const { serverUrl, archivePath, setServerUrl, setArchivePath, saveSettings } =
    useSettingsStore();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header title="Paramètres">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Sauvegardé
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Sauvegarder
            </>
          )}
        </button>
      </Header>

      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-2xl">
        <div className="card space-y-4">
          <h2 className="font-semibold">Connexion au serveur</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              URL du serveur
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Archivage</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Chemin d'archive
            </label>
            <input
              type="text"
              value={archivePath}
              onChange={(e) => setArchivePath(e.target.value)}
              placeholder="Chemin par défaut du serveur"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dossier de destination des documents archivés sur le serveur.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
