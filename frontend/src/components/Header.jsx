import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Truck } from "lucide-react";

const ROLE_LABEL = {
  resident: "Residente",
  driver: "Conductor",
  admin: "Admin",
};

const Header = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-black/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" data-testid="header-logo-link" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-[#0a0a0a] flex items-center justify-center">
            <Truck size={18} strokeWidth={2.5} className="text-[#ff5a00]" />
          </div>
          <div className="leading-none">
            <div className="font-display font-black text-xl tracking-tight">RECOLECTA</div>
            <div className="text-[10px] tracking-[0.3em] text-neutral-500 mt-0.5">CIVIC OPS · MX</div>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="rc-label">{ROLE_LABEL[user.role]}</span>
              <span className="font-display font-bold text-sm" data-testid="header-user-name">
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex items-center gap-2 px-3 py-2 border border-black/15 hover:bg-[#0a0a0a] hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
