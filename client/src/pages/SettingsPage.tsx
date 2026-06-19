import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
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
      <div className="ds-page-head">
        <h1>Paramètres</h1>
        <div className="ds-page-head-actions">
          <button onClick={handleSave} className="ds-btn-primary">
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
        </div>
      </div>

      <div className="ds-page narrow">
        <div className="ds-card">
          <h2>Connexion au serveur</h2>
          <div className="ds-field">
            <label className="ds-label">URL du serveur</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="ds-input"
            />
          </div>
        </div>

        <div className="ds-card">
          <h2>Archivage</h2>
          <div className="ds-field">
            <label className="ds-label">Chemin d'archive</label>
            <input
              type="text"
              value={archivePath}
              onChange={(e) => setArchivePath(e.target.value)}
              placeholder="Chemin par défaut du serveur"
              className="ds-input"
            />
            <p className="ds-hint">
              Dossier de destination des documents archivés sur le serveur.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
