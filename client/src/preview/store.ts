/**
 * Mutable in-memory database for preview mode. Seeded from `./fixtures` and
 * mutated by the mocked API so confirm / reject / upload actually change the
 * lists — the UI feels real, not static. State lives for one page load; the
 * "data state" toggle (populated / empty / error) reseeds via a reload.
 *
 * Preview mode only.
 */
import type { ClientSummary, DocumentRow } from "@/hooks/useApi";
import { DOCUMENTS, SESSIONS, USER, type PreviewSession, type PreviewUser } from "./fixtures";

export type DataMode = "populated" | "empty" | "error";
const MODE_KEY = "previewDataMode";

export function getDataMode(): DataMode {
  const m = sessionStorage.getItem(MODE_KEY);
  return m === "empty" || m === "error" ? m : "populated";
}

export function setDataMode(mode: DataMode): void {
  sessionStorage.setItem(MODE_KEY, mode);
}

interface PreviewDB {
  user: PreviewUser;
  documents: DocumentRow[];
  sessions: PreviewSession[];
}

let db: PreviewDB | null = null;

function seed(mode: DataMode): PreviewDB {
  // `empty` starts with no docs/sessions; `error` keeps full data but the API
  // layer returns 500s for read endpoints (exercises the UI's error paths).
  if (mode === "empty") {
    return { user: USER, documents: [], sessions: [] };
  }
  return {
    user: USER,
    documents: DOCUMENTS.map((d) => ({ ...d })),
    sessions: SESSIONS.map((s) => ({ ...s })),
  };
}

function getDB(): PreviewDB {
  if (!db) db = seed(getDataMode());
  return db;
}

export function getUser(): PreviewUser {
  return getDB().user;
}

export function getSessions(): PreviewSession[] {
  return getDB().sessions;
}

export function getSession(id: string): PreviewSession | undefined {
  return getDB().sessions.find((s) => s.id === id);
}

const UNCLASSIFIED_SENTINEL = "__unclassified__";

/** Clients are derived from documents so counts stay consistent after edits. */
export function deriveClients(): ClientSummary[] {
  const map = new Map<string | null, ClientSummary>();
  for (const d of getDB().documents) {
    const key = d.client_name;
    let c = map.get(key);
    if (!c) {
      c = { name: key, archived_count: 0, inbox_count: 0 };
      map.set(key, c);
    }
    if (d.status === "needs_review") c.inbox_count += 1;
    else if (d.status === "archived") c.archived_count += 1;
  }
  // Named clients first (alphabetical), the "À classifier" bucket (null) last.
  return [...map.values()].sort((a, b) => {
    if (a.name === null) return 1;
    if (b.name === null) return -1;
    return a.name.localeCompare(b.name, "fr");
  });
}

export function queryDocuments(
  status: string | null,
  clientNameParam: string | null
): DocumentRow[] {
  return getDB().documents.filter((d) => {
    if (status && d.status !== status) return false;
    if (clientNameParam == null) return true;
    if (clientNameParam === UNCLASSIFIED_SENTINEL) return d.client_name === null;
    return d.client_name === clientNameParam;
  });
}

export function confirmDocument(
  id: string,
  data?: { document_type?: string; date?: string; client_name?: string }
): void {
  const d = getDB().documents.find((x) => x.id === id);
  if (!d) return;
  d.status = "archived";
  if (data?.document_type) d.document_type = data.document_type;
  if (data?.date) d.document_date = data.date;
  if (data?.client_name) d.client_name = data.client_name;
  const client = d.client_name ?? "À classifier";
  const type = d.document_type ?? "Divers";
  d.final_path = `/Archives/${client}/${type}/2026/${d.original_filename}`;
  d.updated_at = new Date().toISOString();
}

export function rejectDocument(id: string): void {
  const d = getDB().documents.find((x) => x.id === id);
  if (!d) return;
  d.status = "rejected";
  d.updated_at = new Date().toISOString();
}

/** Add freshly "uploaded" files as needs_review docs in the À classifier bucket. */
export function addUploads(filenames: string[]): { id: string; filename: string }[] {
  const created = filenames.map((name, i) => ({
    id: `up-${Date.now()}-${i}`,
    filename: name,
  }));
  const rows: DocumentRow[] = created.map(({ id, filename }) => ({
    id,
    original_filename: filename,
    file_extension: filename.slice(filename.lastIndexOf(".")) || ".pdf",
    status: "needs_review",
    document_type: "Facture",
    document_date: "2026-06-19",
    client_name: null,
    confidence_score: 0.5,
    summary: "Document importé (démo) — à vérifier.",
    final_path: null,
    custom_filename: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  getDB().documents.unshift(...rows);
  return created;
}
