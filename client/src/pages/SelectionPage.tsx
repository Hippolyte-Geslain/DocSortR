import { useEffect, useMemo, useRef, useState } from "react";
import {
  File,
  FolderOpen,
  History,
  Image as ImageIcon,
  Inbox,
  ListTree,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import "@/styles/selection.css";

interface Client {
  id: string;
  name: string;
  archived: number;
  inbox: number;
}

interface Doc {
  id: number;
  name: string;
  path: string;
  size: string;
  pages: number;
  modified: string;
  hint: string;
  isNew: boolean;
}

const CLIENTS: Client[] = [
  { id: "martin", name: "Martin & Associés", archived: 128, inbox: 2 },
  { id: "dubois", name: "Dubois, J.", archived: 73, inbox: 0 },
  { id: "leroy", name: "Leroy SARL", archived: 41, inbox: 8 },
  { id: "john", name: "John Doe", archived: 46, inbox: 3 },
  { id: "nguyen", name: "Nguyen, T.", archived: 22, inbox: 0 },
  { id: "bernard", name: "Bernard & Fils", archived: 18, inbox: 1 },
  { id: "petit", name: "Petit, M.", archived: 12, inbox: 0 },
];

const DOCS: Record<string, Doc[]> = {
  john: [
    { id: 1, name: "facture_edf_mars.pdf", path: "~/Downloads/facture_edf_mars.pdf", size: "148 Ko", pages: 2, modified: "20 avr.", hint: "Facture", isNew: true },
    { id: 2, name: "releve_bnp_q1_2026.pdf", path: "~/Downloads/releve_bnp_q1_2026.pdf", size: "512 Ko", pages: 6, modified: "19 avr.", hint: "Relevé bancaire", isNew: true },
    { id: 3, name: "ordonnance_dr_rey.jpg", path: "~/Downloads/ordonnance_dr_rey.jpg", size: "2,1 Mo", pages: 1, modified: "18 avr.", hint: "Ordonnance", isNew: true },
  ],
  leroy: [
    { id: 11, name: "devis_chantier_lot3.pdf", path: "~/Documents/leroy/devis_chantier_lot3.pdf", size: "221 Ko", pages: 3, modified: "20 avr.", hint: "Devis", isNew: true },
    { id: 12, name: "contrat_sous_traitance.pdf", path: "~/Documents/leroy/contrat_sous_traitance.pdf", size: "388 Ko", pages: 8, modified: "19 avr.", hint: "Contrat", isNew: true },
    { id: 13, name: "kbis_leroy_2026.pdf", path: "~/Documents/leroy/kbis_leroy_2026.pdf", size: "92 Ko", pages: 1, modified: "18 avr.", hint: "Kbis", isNew: true },
    { id: 14, name: "rib_credit_agricole.pdf", path: "~/Documents/leroy/rib_credit_agricole.pdf", size: "54 Ko", pages: 1, modified: "18 avr.", hint: "RIB", isNew: false },
    { id: 15, name: "facture_materiaux_1203.pdf", path: "~/Documents/leroy/facture_materiaux_1203.pdf", size: "176 Ko", pages: 2, modified: "17 avr.", hint: "Facture", isNew: false },
    { id: 16, name: "attestation_urssaf.pdf", path: "~/Documents/leroy/attestation_urssaf.pdf", size: "88 Ko", pages: 1, modified: "16 avr.", hint: "Attestation", isNew: false },
    { id: 17, name: "courrier_maitre_oeuvre.pdf", path: "~/Documents/leroy/courrier_maitre_oeuvre.pdf", size: "112 Ko", pages: 2, modified: "15 avr.", hint: "Courrier", isNew: false },
    { id: 18, name: "avis_imposition_2025.pdf", path: "~/Documents/leroy/avis_imposition_2025.pdf", size: "240 Ko", pages: 4, modified: "14 avr.", hint: "Avis d’imposition", isNew: false },
  ],
  martin: [
    { id: 21, name: "facture_cabinet_avril.pdf", path: "~/scan/martin/facture_cabinet_avril.pdf", size: "132 Ko", pages: 1, modified: "20 avr.", hint: "Facture", isNew: true },
    { id: 22, name: "bulletin_paie_mars.pdf", path: "~/scan/martin/bulletin_paie_mars.pdf", size: "96 Ko", pages: 2, modified: "19 avr.", hint: "Bulletin de paie", isNew: true },
  ],
  bernard: [
    { id: 31, name: "facture_transport_0412.pdf", path: "~/scan/bernard/facture_transport_0412.pdf", size: "142 Ko", pages: 1, modified: "20 avr.", hint: "Facture", isNew: true },
  ],
  dubois: [],
  nguyen: [],
  petit: [],
};

const TOTAL_INBOX = CLIENTS.reduce((s, c) => s + c.inbox, 0);

function Sidebar({
  clientId,
  setClientId,
}: {
  clientId: string;
  setClientId: (id: string) => void;
}) {
  return (
    <aside className="ds-sidebar">
      <div className="ds-sidebar-head">
        <div className="ds-logo">
          <span className="ds-wm">quiet</span>
          <span className="ds-dot" />
          <span className="ds-wm-sub">docsortr</span>
        </div>
        <button className="ds-iconbtn" title="Importer un dossier" aria-label="Importer">
          <Plus />
        </button>
      </div>

      <button className="ds-navitem sel">
        <Inbox />
        <span>Tri</span>
        <span className="ds-nav-count">{TOTAL_INBOX}</span>
      </button>
      <button className="ds-navitem">
        <History />
        <span>Historique</span>
      </button>
      <button className="ds-navitem">
        <FolderOpen />
        <span>Archive</span>
      </button>
      <button className="ds-navitem">
        <Settings />
        <span>Paramètres</span>
      </button>

      <div className="ds-sidebar-label">Clients</div>
      <div className="ds-client-list">
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            className={`ds-client-item ${clientId === c.id ? "sel" : ""}`}
            onClick={() => setClientId(c.id)}
          >
            <span className="ds-client-name">{c.name}</span>
            {c.inbox > 0 && <span className="ds-client-count">{c.inbox}</span>}
          </button>
        ))}
      </div>

      <div className="ds-sidebar-foot">
        <div className="ds-avatar">L</div>
        <div className="ds-userinfo">
          <div className="ds-username">Laure Vidal</div>
          <div className="ds-plan">local · synchronisé</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ client }: { client: Client }) {
  return (
    <div className="ds-topbar">
      <div className="ds-crumbs">
        <ListTree size={14} />
        <span>Tri</span>
        <span className="sep">/</span>
        <span className="cur">{client.name}</span>
        <span className="sep" style={{ marginLeft: 6 }}>·</span>
        <span className="ds-crumb-path">archive/{client.id}/</span>
      </div>
      <div className="ds-topbar-right">
        <button className="ds-iconbtn" title="Actualiser">
          <History />
        </button>
        <button className="ds-iconbtn" title="Paramètres">
          <Settings />
        </button>
      </div>
    </div>
  );
}

function ContextPane({
  client,
  selectedCount,
  totalInInbox,
  onSortAll,
  onSortSelected,
}: {
  client: Client;
  selectedCount: number;
  totalInInbox: number;
  onSortAll: () => void;
  onSortSelected: () => void;
}) {
  const hasDocs = totalInInbox > 0;
  const hasSelection = selectedCount > 0;

  return (
    <section className="ds-context">
      <div className="ds-ctx-eyebrow">Client</div>
      <h1 className="ds-ctx-client">{client.name}</h1>
      <div className="ds-ctx-sub">{client.archived} documents déjà classés</div>

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
          <span className="ds-ctx-inbox-label">Source</span>
          <span className="ds-ctx-inbox-val">~/Downloads</span>
        </div>
        <div className="ds-ctx-inbox-hr" />
        <div className="ds-ctx-inbox-row">
          <span className="ds-ctx-inbox-label">Destination</span>
          <span className="ds-ctx-inbox-val">archive/{client.id}/…</span>
        </div>
        <div className="ds-ctx-inbox-hr" />
        <div className="ds-ctx-inbox-row">
          <span className="ds-ctx-inbox-label">Modèle</span>
          <span className="ds-ctx-inbox-val">mistral-small</span>
        </div>
      </div>

      <div className="ds-ctx-actions">
        <button
          className="ds-btn-secondary"
          onClick={onSortSelected}
          disabled={!hasSelection}
        >
          Trier la sélection
          {selectedCount > 0 && (
            <span className="ds-btn-sel-count">· {selectedCount}</span>
          )}
        </button>
        <button className="ds-btn-primary" onClick={onSortAll} disabled={!hasDocs}>
          Tout trier
          <span className="ds-btn-sub">{totalInInbox} docs</span>
        </button>
        <div className="ds-ctx-tip">
          <span className="ds-kbd">↵</span> pour tout trier ·{" "}
          <span className="ds-kbd">⌘A</span> pour sélectionner
        </div>
      </div>
    </section>
  );
}

function DocTable({
  docs,
  selected,
  toggleOne,
  toggleAll,
  query,
  setQuery,
}: {
  docs: Doc[];
  selected: Set<number>;
  toggleOne: (id: number) => void;
  toggleAll: () => void;
  query: string;
  setQuery: (q: string) => void;
}) {
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
      (d) => d.name.toLowerCase().includes(q) || d.hint.toLowerCase().includes(q)
    );
  }, [docs, query]);

  return (
    <section className="ds-docs">
      <div className="ds-docs-head">
        <div className="ds-docs-title">
          <strong>{docs.length}</strong>{" "}
          {docs.length === 1 ? "nouveau document" : "nouveaux documents"}
          {docs.length > 0 && (
            <>
              {" "}
              · source <span className="src">~/Downloads</span>
            </>
          )}
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

      {docs.length === 0 ? (
        <div className="ds-empty-wrap">
          <div className="ds-empty">
            <div className="ds-empty-mark">
              <Inbox />
            </div>
            <h4>Rien à trier pour ce client.</h4>
            <p>
              Déposez des fichiers dans{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>
                ~/Downloads
              </span>{" "}
              ou glissez-les ici.
            </p>
            <button className="ds-btn-secondary" style={{ marginTop: 8 }}>
              <Upload size={13} /> Importer des fichiers
            </button>
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
                <th className="num">Pages</th>
                <th className="num">Taille</th>
                <th className="num">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const isSel = selected.has(d.id);
                const isImg = /\.(jpe?g|png)$/i.test(d.name);
                return (
                  <tr
                    key={d.id}
                    className={isSel ? "sel" : ""}
                    onClick={() => toggleOne(d.id)}
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
                        {isImg ? <ImageIcon /> : <File />}
                        <div>
                          <div className="ds-fname-text">{d.name}</div>
                          <div className="ds-fname-sub">{d.path}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`ds-pill ${d.isNew ? "new" : ""}`}>
                        {d.isNew && <span className="ds-pill-dot" />}
                        {d.hint}
                      </span>
                    </td>
                    <td className="num">{d.pages}</td>
                    <td className="num">{d.size}</td>
                    <td className="num">{d.modified}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="ds-empty-row">
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
            <span>·</span>
            <span>
              {filtered.length !== docs.length
                ? `${filtered.length} filtrés`
                : "types détectés par heuristique"}
            </span>
          </div>
          <div>
            astuce: <span className="ds-kbd">espace</span> pour aperçu
          </div>
        </div>
      )}
    </section>
  );
}

export function SelectionPage() {
  const [clientId, setClientId] = useState<string>("john");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelected(new Set());
    setQuery("");
  }, [clientId]);

  const client = CLIENTS.find((c) => c.id === clientId) || CLIENTS[0];
  const docs = DOCS[clientId] || [];

  const toggleOne = (id: number) => {
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

  const onSortAll = () => {
    if (docs.length === 0) return;
    alert(`Tri de ${docs.length} documents pour ${client.name}…`);
  };
  const onSortSelected = () => {
    if (selected.size === 0) return;
    alert(`Tri de ${selected.size} documents pour ${client.name}…`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".ds-search input")?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        toggleAll();
      } else if (e.key === "Enter" && !typing) {
        if (docs.length > 0) onSortAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="ds-app">
      <Sidebar clientId={clientId} setClientId={setClientId} />
      <main className="ds-main">
        <TopBar client={client} />
        <div className="ds-split">
          <ContextPane
            client={client}
            selectedCount={selected.size}
            totalInInbox={docs.length}
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
          />
        </div>
      </main>
    </div>
  );
}

