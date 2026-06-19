import { Outlet } from "react-router-dom";
import { AuthGate } from "./AuthGate";
import { QuietSidebar } from "./QuietSidebar";

/**
 * Light "Quiet" shell for the secondary routes (/upload, /history, /settings).
 * Renders the shared sidebar (nav only) next to the routed page. The Tri page
 * (SelectionPage) renders its own ds-app shell because it additionally needs
 * the client list inside the sidebar.
 */
export function QuietShell() {
  return (
    <AuthGate>
      <div className="ds-app">
        <QuietSidebar />
        <main className="ds-main">
          <Outlet />
        </main>
      </div>
    </AuthGate>
  );
}
