import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, LogOut, Command, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="h-16 border-b border-[#242C3A] bg-[#080B12]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      
      {/* Global Search Bar */}
      <div className="relative w-72 md:w-96">
        <Search className="w-4 h-4 text-[#687386] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search requests, quotations, SKUs, customers..."
          className="w-full bg-[#111722] border border-[#242C3A] rounded-xl pl-9 pr-12 py-2 text-xs text-[#F5F7FA] placeholder-[#687386] focus:outline-none focus:border-[#6366F1] transition"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#161D29] text-[10px] text-[#A7B0C0] font-mono border border-[#242C3A]">
          <Command className="w-2.5 h-2.5" /> K
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-3">
        
        {/* Date Context Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111722] border border-[#242C3A] text-xs font-semibold text-[#A7B0C0]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{currentDateStr}</span>
        </div>

        {/* Live Notification Bell Trigger */}
        <button
          className="relative p-2.5 rounded-xl bg-[#111722] border border-[#242C3A] text-[#A7B0C0] hover:text-[#F5F7FA] hover:border-[#6366F1]/50 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6366F1]" />
        </button>

        {/* User Profile Info & Role Tag */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#242C3A]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#22D3EE] flex items-center justify-center font-extrabold text-white text-xs shadow-md">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-[#F5F7FA] leading-tight">{user.name}</p>
            <p className="text-[10px] font-extrabold text-[#818CF8] uppercase tracking-wider leading-tight mt-0.5">
              {user.role?.replace('_', ' ')}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-extrabold text-xs transition"
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
