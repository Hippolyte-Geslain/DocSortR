import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
      <button
        onClick={logout}
        className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
        title="Déconnexion"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
