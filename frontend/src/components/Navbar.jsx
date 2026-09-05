import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Bell, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Search Bar */}
      <div className="relative w-72 md:w-80">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search quotations, customers, SKU..."
          className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Light / Dark Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2 rounded-xl bg-muted border border-border text-foreground hover:border-primary/50 transition flex items-center gap-2 text-xs font-bold shadow-sm"
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Dark Theme</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"></span>
        </button>

        {/* User Profile & Role Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center font-bold text-white text-xs shadow">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-foreground leading-tight">{user.name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">{user.role?.replace('_', ' ')}</p>
          </div>
          
          {/* Explicit Logout Button with Text & Icon */}
          <button
            onClick={handleLogout}
            title="Sign Out of DealFlow360"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs transition shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
