import { NavLink, useNavigate } from "react-router-dom";
import {
  FolderOpen,
  History,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import type { ClientSummary } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useDepsHealth, isAllHealthy } from "@/hooks/useDepsHealth";
import { clientKey, clientLabel } from "@/lib/clients";

interface QuietSidebarProps {
  /** When provided, the "Clients" section is shown (Tri page only). */
  clients?: ClientSummary[];
  selectedKey?: string | null;
  onSelectClient?: (key: string) => void;
  /** Total pending docs — shown as a badge on the Tri nav item. */
  totalInbox?: number;
  /** Quick-import action on the Tri page; elsewhere the + navigates to /upload. */
  onQuickUpload?: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Tri", icon: Inbox, end: true },
  { to: "/upload", label: "Traitement", icon: Upload, end: false },
  { to: "/history", label: "Historique", icon: History, end: false },
];

/**
 * The single application sidebar (light "Quiet" design). Used directly by the
 * Tri page (with a client list) and by QuietShell for every other route.
 */
export function QuietSidebar({
  clients,
  selectedKey = null,
  onSelectClient,
  totalInbox,
  onQuickUpload,
}: QuietSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const deps = useDepsHealth();

  const healthState = deps === null ? "warn" : isAllHealthy(deps) ? "ok" : "down";
  const healthLabel =
    deps === null
      ? "Vérification de l'état du système…"
      : healthState === "ok"
        ? "Système opérationnel"
        : "Une dépendance est indisponible";

  const handlePlus = () => {
    if (onQuickUpload) onQuickUpload();
    else navigate("/upload");
  };

  return (
    <aside className="ds-sidebar">
      <div className="ds-sidebar-head">
        <div className="ds-logo">
          <span className="ds-wm">quiet</span>
          <span className="ds-dot" />
          <span className="ds-wm-sub">docsortr</span>
        </div>
        <button
          className="ds-iconbtn"
          title="Importer des documents"
          aria-label="Importer"
          onClick={handlePlus}
        >
          <Plus />
        </button>
      </div>

      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `ds-navitem ${isActive ? "sel" : ""}`}
        >
          <Icon />
          <span>{label}</span>
          {to === "/" && totalInbox != null && totalInbox > 0 && (
            <span className="ds-nav-count">{totalInbox}</span>
          )}
        </NavLink>
      ))}

      <button
        className="ds-navitem disabled"
        disabled
        title="Bientôt disponible"
      >
        <FolderOpen />
        <span>Archive</span>
        <span className="ds-nav-soon">Bientôt</span>
      </button>

      <NavLink
        to="/settings"
        className={({ isActive }) => `ds-navitem ${isActive ? "sel" : ""}`}
      >
        <Settings />
        <span>Paramètres</span>
      </NavLink>

      {clients && (
        <>
          <div className="ds-sidebar-label">Clients</div>
          <div className="ds-client-list">
            {clients.length === 0 && (
              <div
                style={{
                  padding: "12px 14px",
                  fontSize: 12,
                  color: "var(--fg-3)",
                  lineHeight: 1.4,
                }}
              >
                Aucun client pour l'instant. Cliquez sur + pour importer des
                documents.
              </div>
            )}
            {clients.map((c) => {
              const key = clientKey(c);
              return (
                <button
                  key={key}
                  className={`ds-client-item ${selectedKey === key ? "sel" : ""}`}
                  onClick={() => onSelectClient?.(key)}
                >
                  <span className="ds-client-name">{clientLabel(c)}</span>
                  {c.inbox_count > 0 && (
                    <span className="ds-client-count">{c.inbox_count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="ds-sidebar-foot">
        <div className="ds-avatar">{(user?.name?.[0] ?? "U").toUpperCase()}</div>
        <div className="ds-userinfo">
          <div className="ds-username">{user?.name ?? "Utilisateur"}</div>
          <div className="ds-plan">local · hors-ligne</div>
        </div>
        <div className="ds-foot-actions">
          <span
            className={`ds-health-dot ${healthState}`}
            title={healthLabel}
            aria-label={healthLabel}
          />
          <button
            className="ds-foot-btn"
            onClick={logout}
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
