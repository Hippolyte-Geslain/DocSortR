/**
 * Static seed data for preview mode. All French, mirrors the real API shapes
 * consumed by the UI (see `@/hooks/useApi` and the pages). This module is pure
 * data + a tiny builder; the mutable layer lives in `./store`.
 *
 * Preview mode only — never bundled into the Electron/production build.
 */
import type { DocumentRow } from "@/hooks/useApi";

export interface PreviewUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: string;
}

export interface PreviewSession {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  document_count: number;
}

export const USER: PreviewUser = {
  id: "local-user",
  email: "local@docsortr.app",
  name: "Utilisateur Local",
  avatar_url: null,
  provider: "local",
};

/** Fill the long `DocumentRow` shape from a small partial. */
function doc(partial: Partial<DocumentRow> & Pick<DocumentRow, "id" | "original_filename" | "status">): DocumentRow {
  return {
    file_extension: ".pdf",
    document_type: null,
    document_date: null,
    client_name: null,
    confidence_score: null,
    summary: null,
    final_path: null,
    custom_filename: null,
    error_message: null,
    created_at: "2026-06-18T09:00:00Z",
    updated_at: "2026-06-18T09:00:00Z",
    ...partial,
  } as DocumentRow;
}

export const DOCUMENTS: DocumentRow[] = [
  // --- Dupont SARL : à trier + déjà classés ---
  doc({
    id: "d-001",
    original_filename: "Facture_EDF_juin_2026.pdf",
    status: "needs_review",
    document_type: "Facture",
    document_date: "2026-06-03",
    client_name: "Dupont SARL",
    confidence_score: 0.96,
    summary: "Facture d'électricité — 142,30 € TTC, échéance 28/06.",
    created_at: "2026-06-18T08:12:00Z",
  }),
  doc({
    id: "d-002",
    original_filename: "Contrat_prestation_signe.pdf",
    status: "needs_review",
    document_type: "Contrat",
    document_date: "2026-06-10",
    client_name: "Dupont SARL",
    confidence_score: 0.88,
    summary: "Contrat de prestation de services, durée 12 mois.",
    created_at: "2026-06-18T08:15:00Z",
  }),
  doc({
    id: "d-003",
    original_filename: "scan_20260615_103244.jpg",
    file_extension: ".jpg",
    status: "needs_review",
    document_type: "Relevé Bancaire",
    document_date: "2026-05-31",
    client_name: "Dupont SARL",
    confidence_score: 0.61,
    summary: "Relevé de compte professionnel, mai 2026.",
    created_at: "2026-06-18T08:20:00Z",
  }),
  doc({
    id: "d-010",
    original_filename: "Facture_OVH_mai_2026.pdf",
    status: "archived",
    document_type: "Facture",
    document_date: "2026-05-02",
    client_name: "Dupont SARL",
    confidence_score: 0.97,
    final_path: "/Archives/Dupont SARL/Facture/2026/Facture_OVH_mai_2026.pdf",
    created_at: "2026-05-20T10:00:00Z",
  }),
  doc({
    id: "d-011",
    original_filename: "Kbis_2026.pdf",
    status: "archived",
    document_type: "Kbis",
    document_date: "2026-01-15",
    client_name: "Dupont SARL",
    confidence_score: 0.99,
    final_path: "/Archives/Dupont SARL/Kbis/2026/Kbis_2026.pdf",
    created_at: "2026-02-01T11:00:00Z",
  }),

  // --- Cabinet Lefèvre : à trier ---
  doc({
    id: "d-004",
    original_filename: "Bulletin_paie_05_2026.pdf",
    status: "needs_review",
    document_type: "Bulletin de Paie",
    document_date: "2026-05-31",
    client_name: "Cabinet Lefèvre",
    confidence_score: 0.93,
    summary: "Bulletin de paie de mai 2026, net à payer 2 410,00 €.",
    created_at: "2026-06-17T16:40:00Z",
  }),
  doc({
    id: "d-005",
    original_filename: "Avis_imposition_2025.pdf",
    status: "needs_review",
    document_type: "Avis d'Imposition",
    document_date: "2025-09-12",
    client_name: "Cabinet Lefèvre",
    confidence_score: 0.71,
    summary: "Avis d'impôt sur le revenu, année 2025.",
    created_at: "2026-06-17T16:42:00Z",
  }),
  doc({
    id: "d-012",
    original_filename: "RIB_Cabinet.pdf",
    status: "archived",
    document_type: "RIB",
    client_name: "Cabinet Lefèvre",
    confidence_score: 0.98,
    final_path: "/Archives/Cabinet Lefèvre/RIB/2026/RIB_Cabinet.pdf",
    created_at: "2026-04-10T09:30:00Z",
  }),

  // --- Boulangerie Martin : un seul à trier ---
  doc({
    id: "d-006",
    original_filename: "Devis_renovation_four.pdf",
    status: "needs_review",
    document_type: "Devis",
    document_date: "2026-06-09",
    client_name: "Boulangerie Martin",
    confidence_score: 0.84,
    summary: "Devis rénovation du four — 8 750 € HT.",
    created_at: "2026-06-18T07:55:00Z",
  }),

  // --- À classifier (client null) ---
  doc({
    id: "d-007",
    original_filename: "document_sans_nom.pdf",
    status: "needs_review",
    document_type: null,
    confidence_score: 0.22,
    summary: "Type incertain — vérification manuelle requise.",
    created_at: "2026-06-18T08:30:00Z",
  }),
  doc({
    id: "d-008",
    original_filename: "ordonnance_scan.png",
    file_extension: ".png",
    status: "needs_review",
    document_type: "Ordonnance",
    document_date: "2026-06-14",
    confidence_score: 0.55,
    summary: "Ordonnance médicale, prescripteur illisible.",
    created_at: "2026-06-18T08:34:00Z",
  }),

  // --- États terminaux pour la vue Traitement ---
  doc({
    id: "d-009",
    original_filename: "courrier_corrompu.pdf",
    status: "error",
    error_message: "Échec de l'OCR : fichier illisible.",
    created_at: "2026-06-18T08:40:00Z",
  }),
];

export const SESSIONS: PreviewSession[] = [
  {
    id: "s-001",
    name: null,
    status: "completed",
    created_at: "2026-06-18T08:10:00Z",
    document_count: 6,
  },
  {
    id: "s-002",
    name: "Import comptabilité Q2",
    status: "completed",
    created_at: "2026-06-12T14:05:00Z",
    document_count: 23,
  },
  {
    id: "s-003",
    name: null,
    status: "processing",
    created_at: "2026-06-19T09:02:00Z",
    document_count: 3,
  },
];
