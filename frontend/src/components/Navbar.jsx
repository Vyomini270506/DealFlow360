import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, LogOut, Command, Sparkles, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const routeLabels = {
  '/sales-rep': 'Sales Representative',
  '/sales-manager': 'Sales Manager',
  '/finance': 'Finance & Operations',
  '/customer-portal': 'Customer Portal',
  '/admin': 'Admin Console',
  '/quotations': 'Quotations',
  '/approvals': 'Approvals',
  '/fulfillment': 'Fulfillment & Stock',
  '/invoices': 'Invoices & Billing',
  '/subscriptions': 'Subscriptions',
  '/deal-health': 'Deal Health Monitor',
  '/closed-deals': 'Closed Deals',
  '/negotiations': 'Negotiations',
};

const roleColors = {
  ADMIN: 'text-amber-400',
  SALES_MANAGER: 'text-indigo-400',
  SALES_REP: 'text-cyan-400',
  FINANCE_OPERATIONS: 'text-emerald-400',
  CUSTOMER: 'text-purple-400',
};

const roleLabel = (role) => {
  const map = {
    ADMIN: 'Admin',
    SALES_MANAGER: 'Sales Manager',
    SALES_REP: 'Sales Rep',
    FINANCE_OPERATIONS: 'Finance & Ops',
    CUSTOMER: 'Customer',
  };
  return map[role] || role;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPage = routeLabels[location.pathname] || 'Dashboard';

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl px-5 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/20">

      {/* Left — Page Context */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchOpen ? 'w-80 md:w-[420px]' : 'w-56 md:w-72'}`}>
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            placeholder="Search quotations, customers, SKUs…"
            className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/70 text-[10px] text-slate-500 font-mono border border-slate-700/40 pointer-events-none select-none">
              <Command className="w-2.5 h-2.5" />K
            </div>
          )}
        </div>

        {/* Current page label — hidden when search is wide */}
        {!searchOpen && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 font-semibold truncate">{currentPage}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">

        {/* Date badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/70 text-[11px] font-semibold text-slate-500 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          {currentDateStr}
        </div>

        {/* Notification bell */}
        <button
          className="relative p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-slate-500 hover:text-white hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all shadow-sm group"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4 group-hover:scale-105 transition-transform" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#060911]" />
        </button>

        {/* User profile strip */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-800/70 ml-0.5">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-px shadow-md shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-extrabold text-white text-xs">
              {user.name?.charAt(0) ?? 'U'}
            </div>
          </div>

          {/* Name + role */}
          <div className="hidden md:block text-left leading-tight">
            <p className="text-[12px] font-extrabold text-white flex items-center gap-1">
              {user.name}
              {user.role === 'ADMIN' && <Sparkles className="w-3 h-3 text-amber-400" />}
            </p>
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${roleColors[user.role] || 'text-indigo-400'}`}>
              {roleLabel(user.role)}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/8 hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-500/45 text-rose-400 font-extrabold text-[11px] transition-all ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
