export const SERVER_URL = "http://localhost:8000";

export const DOCUMENT_TYPES = [
  "Facture",
  "Devis",
  "Contrat",
  "Relevé Bancaire",
  "Bulletin de Paie",
  "Avis d'Imposition",
  "Attestation",
  "Kbis",
  "RIB",
  "Ordonnance",
  "Courrier",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const SORT_OPTIONS = ["date", "type", "name"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
