import { useDepsHealth, isAllHealthy } from "@/hooks/useDepsHealth";

function reasons(d: DepsHealth | null): string[] {
  if (!d) return ["Serveur DocSortR injoignable"];
  if (d.healthy === false && d.error) return [d.error];
  const out: string[] = [];
  if (d.ollama_reachable === false) out.push("Moteur IA arrêté");
  if (d.model_present === false) out.push("Modèle manquant");
  if (d.ocr_models_present === false) out.push("Modèles OCR non chargés");
  if (d.archive_writable === false) out.push("Dossier d'archivage inaccessible");
  if (d.db_ok === false) out.push("Base de données indisponible");
  return out;
}

export function DepsHealthBadge() {
  const data = useDepsHealth();
  const healthy = isAllHealthy(data);
  const problems = reasons(data);

  const color = healthy ? "bg-green-500" : problems.length > 0 ? "bg-red-500" : "bg-yellow-500";
  const label = healthy ? "Tout fonctionne" : problems.join(" · ");

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400"
      title={label}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden />
      <span className="truncate">
        {healthy ? "Système opérationnel" : problems[0] ?? "Vérification…"}
      </span>
    </div>
  );
}
