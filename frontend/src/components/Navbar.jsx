import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Bell, LogOut, Shield, ChevronDown, Sparkles, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, quickLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  if (!user) return null;

  const handleRoleSwitch = async (role) => {
    setShowRoleMenu(false);
    await quickLogin(role);
    const dashboardRoutes = {
      SALES_REP: '/sales-rep',
      SALES_MANAGER: '/sales-manager',
      FINANCE_OPERATIONS: '/finance',
      CUSTOMER: '/customer-portal',
      ADMIN: '/admin'
    };
    navigate(dashboardRoutes[role] || '/');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search quotations, customers, SKU..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Day / Night Theme Toggle Switcher */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Day Theme (Light)' : 'Switch to Night Theme (Dark)'}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-slate-300">Day Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline text-slate-700">Night Theme</span>
            </>
          )}
        </button>

        {/* Quick Role Switcher Dropdown (Demo Helper) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Switch Role (Demo)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">Quick Login Demo</p>
              {[
                { role: 'SALES_REP', label: 'Sales Rep (Rahul)' },
                { role: 'SALES_MANAGER', label: 'Sales Manager (Vikram)' },
                { role: 'FINANCE_OPERATIONS', label: 'Finance / Ops (Karan)' },
                { role: 'CUSTOMER', label: 'Customer Portal (Acme)' },
                { role: 'ADMIN', label: 'System Admin' },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleRoleSwitch(item.role)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition ${
                    user.role === item.role ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  {user.role === item.role && <Shield className="w-3 h-3 text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500"></span>
        </button>

        {/* User Avatar & Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-white text-xs shadow">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
