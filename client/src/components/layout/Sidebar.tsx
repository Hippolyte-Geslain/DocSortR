import { NavLink } from "react-router-dom";
import { FileText, History, Settings, Upload } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { DepsHealthBadge } from "./DepsHealthBadge";

const navItems = [
  { to: "/", icon: Upload, label: "Traitement" },
  { to: "/history", icon: History, label: "Historique" },
  { to: "/settings", icon: Settings, label: "Paramètres" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col h-full">
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-accent-500" />
          <span className="text-lg font-bold">DocSortR</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent-500/10 text-accent-400"
                  : "text-gray-400 hover:text-white hover:bg-dark-700"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-dark-700">
        <DepsHealthBadge />
      </div>
      <div className="border-t border-dark-700 p-2">
        <UserMenu />
      </div>
    </aside>
  );
}
