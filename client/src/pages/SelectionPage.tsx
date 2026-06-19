import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  File,
  Image as ImageIcon,
  Inbox,
  ListTree,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useApi, type ClientSummary, type DocumentRow } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAppStore } from "@/stores/appStore";
import { QuietSidebar } from "@/components/layout/QuietSidebar";
import { clientKey, clientLabel } from "@/lib/clients";
import { ReviewModal } from "@/components/review/ReviewModal";
import { DropZone } from "@/components/upload/DropZone";
import { ALLOWED_EXTENSIONS } from "@/lib/constants";
import type { ProcessingDocument } from "@/stores/appStore";
import "@/styles/selection.css";

function clientSlug(name: string | null): string {
  if (name === null) return "a-classifier";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateFr(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function isImage(filename: string): boolean {
  return /\.(jpe?g|png)$/i.test(filename);
}

function TopBar({ client }: { client: ClientSummary | null }) {
  return (
    <div className="ds-topbar">
      <div className="ds-crumbs">
        <ListTree size={14} />
        <span>Tri</span>
        {client && (
          <>
            <span className="sep">/</span>
            <span className="cur">{clientLabel(client)}</span>
            <span className="sep" style={{ marginLeft: 6 }}>·</span>
            <span className="ds-crumb-path">archive/{clientSlug(client.name)}/</span>
          </>
        )}
      </div>
    </div>
  );
}

interface ContextPaneProps {
  client: ClientSummary | null;
  selectedCount: number;
  totalInInbox: number;
  busy: { current: number; total: number } | null;
  onSortAll: () => void;
  onSortSelected: () => void;
}

function ContextPane({
  client,
  selectedCount,
  totalInInbox,
  busy,
  onSortAll,
  onSortSelected,
}: ContextPaneProps) {
  const hasDocs = totalInInbox > 0;
  const hasSelection = selectedCount > 0;

  if (!client) {
    return (
      <section className="ds-context">
        <div className="ds-ctx-eyebrow">Aucun client</div>
        <h1 className="ds-ctx-client">Rien à trier</h1>
        <div className="ds-ctx-sub">
          Importez des documents pour qu'ils apparaissent ici, regroupés par client.
        </div>
      </section>
    );
  }

  return (
    <section className="ds-context">
      <div className="ds-ctx-eyebrow">Client</div>
      <h1 className="ds-ctx-client">{clientLabel(client)}</h1>
      <div className="ds-ctx-sub">
        {client.archived_count} document{client.archived_count > 1 ? "s" : ""} déjà classé
        {client.archived_count > 1 ? "s" : ""}
      </div>

      <div className="ds-ctx-rule" />

      <div className="ds-ctx-eyebrow">En attente</div>
      <div className="ds-ctx-stat" style={{ marginTop: 6 }}>
        <span className={`ds-ctx-stat-num ${hasDocs ? "" : "muted"}`}>{totalInInbox}</span>
        <span className="ds-ctx-stat-label">
          {totalInInbox === 1 ? "document" : "documents"} à trier
        </span>
      </div>

      <div className="ds-ctx-inbox">
        <div className="ds-ctx-inbox-row">
          <span className="ds-ctx-inbox-label">Destination</span>
          <span className="ds-ctx-inbox-val">archive/{clientSlug(client.name)}/…</span>
        </div>
      </div>

      <div className="ds-ctx-actions">
        <button
          className="ds-btn-secondary"
          onClick={onSortSelected}
          disabled={!hasSelection || busy !== null}
        >
          Trier la sélection
          {selectedCount > 0 && (
            <span className="ds-btn-sel-count">· {selectedCount}</span>
          )}
        </button>
        <button
          className="ds-btn-primary"
          onClick={onSortAll}
          disabled={!hasDocs || busy !== null}
        >
          {busy !== null ? `Tri… ${busy.current}/${busy.total}` : "Tout trier"}
          {busy === null && (
            <span className="ds-btn-sub">
              {totalInInbox} doc{totalInInbox > 1 ? "s" : ""}
            </span>
          )}
        </button>
        <div className="ds-ctx-tip">
          <span className="ds-kbd">↵</span> pour tout trier ·{" "}
          <span className="ds-kbd">⌘A</span> pour sélectionner
        </div>
      </div>
    </section>
  );
}

interface DocTableProps {
  docs: DocumentRow[];
  selected: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  query: string;
  setQuery: (q: string) => void;
  onRowOpen: (doc: DocumentRow) => void;
  loading: boolean;
}

function DocTable({
  docs,
  selected,
  toggleOne,
  toggleAll,
  query,
  setQuery,
  onRowOpen,
  loading,
}: DocTableProps) {
  const allSelected = docs.length > 0 && docs.every((d) => selected.has(d.id));
  const someSelected = docs.some((d) => selected.has(d.id));
  const headerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const filtered = useMemo(() => {
    if (!query.trim()) return docs;
    const q = query.toLowerCase();
    return docs.filter(
      (d) =>
        d.original_filename.toLowerCase().includes(q) ||
        (d.document_type ?? "").toLowerCase().includes(q)
    );
  }, [docs, query]);

  return (
    <section className="ds-docs">
      <div className="ds-docs-head">
        <div className="ds-docs-title">
          <strong>{docs.length}</strong>{" "}
          {docs.length === 1 ? "document en attente" : "documents en attente"}
        </div>
        <div className="ds-docs-tools">
          <div className="ds-search">
            <Search />
            <input
              placeholder="Rechercher par nom"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {!query && <span className="kbd-hint">/</span>}
          </div>
          <button className="ds-filter">
            <SlidersHorizontal size={12} /> Type
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ds-empty-wrap">
          <div className="ds-empty">
            <h4>Chargement…</h4>
          </div>
        </div>
      ) : docs.length === 0 ? (
        <div className="ds-empty-wrap">
          <div className="ds-empty">
            <div className="ds-empty-mark">
              <Inbox />
            </div>
            <h4>Rien à trier pour ce client.</h4>
            <p>
              Cliquez sur <span style={{ fontFamily: "var(--font-mono)" }}>+</span> dans
              la barre latérale pour importer des fichiers.
            </p>
          </div>
        </div>
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="check">
                  <input
                    ref={headerRef}
                    className="ds-check"
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>Fichier</th>
                <th>Suggéré</th>
                <th className="num">Confiance</th>
                <th className="num">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const isSel = selected.has(d.id);
                const img = isImage(d.original_filename);
                // A classification is only "determined" once processing is
                // finalized (needs_review/archived) AND the LLM returned a type.
                // Until then we never display an assumed type or confidence —
                // the document is shown as "à déterminer" / 0 %.
                const determined =
                  (d.status === "needs_review" || d.status === "archived") &&
                  !!d.document_type;
                const confPct =
                  determined && d.confidence_score != null
                    ? Math.round(d.confidence_score * 100)
                    : null;
                return (
                  <tr
                    key={d.id}
                    className={isSel ? "sel" : ""}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("td.check")) return;
                      onRowOpen(d);
                    }}
                  >
                    <td className="check" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="ds-check"
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleOne(d.id)}
                      />
                    </td>
                    <td className="name">
                      <div className="ds-fname">
                        {img ? <ImageIcon /> : <File />}
                        <div>
                          <div className="ds-fname-text">{d.original_filename}</div>
                          {d.summary && (
                            <div className="ds-fname-sub">{d.summary}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {determined ? (
                        <span className="ds-pill new">
                          <span className="ds-pill-dot" />
                          {d.document_type}
                        </span>
                      ) : (
                        <span className="ds-pill pending">à déterminer</span>
                      )}
                    </td>
                    <td className="num">
                      {determined ? (
                        confPct != null ? `${confPct}%` : "—"
                      ) : (
                        <span style={{ color: "var(--fg-4)" }}>0%</span>
                      )}
                    </td>
                    <td className="num">{formatDateFr(d.created_at)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="ds-empty-row">
                    Aucun document ne correspond à «&nbsp;{query}&nbsp;».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {docs.length > 0 && (
        <div className="ds-docs-foot">
          <div className="ds-docs-foot-left">
            <span>
              <span className="sel-count">{selected.size}</span> / {docs.length} sélectionnés
            </span>
            {filtered.length !== docs.length && (
              <>
                <span>·</span>
                <span>{filtered.length} filtrés</span>
              </>
            )}
          </div>
          <div>
            astuce: <span className="ds-kbd">clic</span> pour ouvrir
          </div>
        </div>
      )}
    </section>
  );
}

interface UploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

function UploadModal({ onClose, onUploaded }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const { uploadFiles } = useApi();

  const handleSend = async () => {
    if (files.length === 0) return;
    setBusy(true);
    try {
      await uploadFiles(files);
      onUploaded();
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ds-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="ds-modal">
        <div className="ds-modal-head">
          <h2 className="ds-modal-title">Importer des documents</h2>
          <button
            className="ds-iconbtn"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
          >
            <X />
          </button>
        </div>

        <DropZone
          onFilesSelected={(f) => setFiles((p) => [...p, ...f])}
          allowedExtensions={ALLOWED_EXTENSIONS}
        />

        {files.length > 0 && (
          <div className="ds-modal-list">
            {files.map((f, i) => (
              <div key={i} className="ds-file-row">
                <File className="lead" />
                <span className="ds-file-name">{f.name}</span>
                <button
                  className="ds-file-x"
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                  aria-label="Retirer le fichier"
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ds-modal-actions">
          <button className="ds-btn-secondary" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            className="ds-btn-primary"
            onClick={handleSend}
            disabled={files.length === 0 || busy}
          >
            <Send className="w-4 h-4" />
            {busy ? "Envoi…" : `Envoyer (${files.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function rowToProcessingDoc(d: DocumentRow): ProcessingDocument {
  return {
    id: d.id,
    filename: d.original_filename,
    status: "needs_review",
    documentType: d.document_type ?? undefined,
    date: d.document_date ?? undefined,
    clientName: d.client_name ?? undefined,
    confidence: d.confidence_score ?? undefined,
    summary: d.summary ?? undefined,
  };
}

export function SelectionPage() {
  useWebSocket();

  const lastUpdate = useAppStore((s) => s.lastUpdate);

  const { getClients, getDocumentsForClient, confirmDocument, rejectDocument } = useApi();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [reviewDoc, setReviewDoc] = useState<DocumentRow | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [busy, setBusy] = useState<{ current: number; total: number } | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => clientKey(c) === selectedKey) ?? null,
    [clients, selectedKey]
  );

  const refreshClients = useCallback(async () => {
    try {
      const list = await getClients();
      setClients(list);
      setSelectedKey((prev) => {
        if (prev && list.some((c) => clientKey(c) === prev)) return prev;
        const firstWithInbox = list.find((c) => c.inbox_count > 0);
        if (firstWithInbox) return clientKey(firstWithInbox);
        return list[0] ? clientKey(list[0]) : null;
      });
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }, [getClients]);

  const refreshDocs = useCallback(
    async (key: string | null) => {
      if (key === null) {
        setDocs([]);
        return;
      }
      setDocsLoading(true);
      try {
        const clientName = key === "__unclassified__" ? null : key;
        const list = await getDocumentsForClient(clientName);
        setDocs(list);
      } catch (err) {
        console.error("Failed to load documents:", err);
        setDocs([]);
      } finally {
        setDocsLoading(false);
      }
    },
    [getDocumentsForClient]
  );

  // Initial + WS-driven refetch
  useEffect(() => {
    void refreshClients();
  }, [refreshClients, lastUpdate]);

  useEffect(() => {
    void refreshDocs(selectedKey);
    setSelected(new Set());
    setQuery("");
  }, [selectedKey, refreshDocs, lastUpdate]);

  const totalInbox = useMemo(
    () => clients.reduce((s, c) => s + c.inbox_count, 0),
    [clients]
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d.id)));
  };

  const bulkConfirm = useCallback(
    async (targets: DocumentRow[]) => {
      if (targets.length === 0) return;
      setBusy({ current: 0, total: targets.length });
      let i = 0;
      for (const d of targets) {
        i += 1;
        setBusy({ current: i, total: targets.length });
        if (!d.document_type) continue; // skip — needs manual review
        try {
          await confirmDocument(d.id, {
            document_type: d.document_type,
            date: d.document_date ?? undefined,
            client_name: d.client_name ?? undefined,
          });
        } catch (err) {
          console.error(`Failed to confirm ${d.id}:`, err);
        }
      }
      setBusy(null);
      setSelected(new Set());
      await refreshClients();
      await refreshDocs(selectedKey);
    },
    [confirmDocument, refreshClients, refreshDocs, selectedKey]
  );

  const onSortAll = useCallback(() => {
    void bulkConfirm(docs);
  }, [bulkConfirm, docs]);

  const onSortSelected = useCallback(() => {
    void bulkConfirm(docs.filter((d) => selected.has(d.id)));
  }, [bulkConfirm, docs, selected]);

  const handleConfirmOne = useCallback(
    async (
      docId: string,
      data: { document_type: string; date?: string; client_name?: string }
    ) => {
      try {
        await confirmDocument(docId, data);
        await refreshClients();
        await refreshDocs(selectedKey);
      } catch (err) {
        console.error("Confirm failed:", err);
      }
    },
    [confirmDocument, refreshClients, refreshDocs, selectedKey]
  );

  const handleRejectOne = useCallback(
    async (docId: string) => {
      try {
        await rejectDocument(docId);
        await refreshClients();
        await refreshDocs(selectedKey);
      } catch (err) {
        console.error("Reject failed:", err);
      }
    },
    [rejectDocument, refreshClients, refreshDocs, selectedKey]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".ds-search input")?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !typing) {
        if (docs.length === 0) return;
        e.preventDefault();
        toggleAll();
      } else if (e.key === "Enter" && !typing && busy === null) {
        if (docs.length > 0) onSortAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="ds-app">
      <QuietSidebar
        clients={clients}
        selectedKey={selectedKey}
        onSelectClient={setSelectedKey}
        totalInbox={totalInbox}
        onQuickUpload={() => setShowUpload(true)}
      />
      <main className="ds-main">
        <TopBar client={selectedClient} />
        <div className="ds-split">
          <ContextPane
            client={selectedClient}
            selectedCount={selected.size}
            totalInInbox={docs.length}
            busy={busy}
            onSortAll={onSortAll}
            onSortSelected={onSortSelected}
          />
          <DocTable
            docs={docs}
            selected={selected}
            toggleOne={toggleOne}
            toggleAll={toggleAll}
            query={query}
            setQuery={setQuery}
            onRowOpen={setReviewDoc}
            loading={docsLoading}
          />
        </div>
      </main>

      {reviewDoc && (
        <ReviewModal
          doc={rowToProcessingDoc(reviewDoc)}
          onConfirm={handleConfirmOne}
          onReject={handleRejectOne}
          onClose={() => setReviewDoc(null)}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            // Refresh immediately; WS will also bump shortly
            void refreshClients();
            void refreshDocs(selectedKey);
          }}
        />
      )}
    </div>
  );
}
