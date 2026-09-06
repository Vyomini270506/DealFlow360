import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Truck, 
  FileCheck2, 
  Repeat, 
  Activity, 
  MessageSquare,
  Briefcase,
  ShoppingCart,
  CreditCard,
  UserCheck,
  Send,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Award,
  ShoppingBag
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;
  const role = user.role;

  const getNavLinks = () => {
    switch (role) {
      case 'SALES_REP':
        return [
          { name: 'Dashboard', path: '/sales-rep?tab=dashboard', icon: LayoutDashboard },
          { name: 'Requests', path: '/sales-rep?tab=requests', icon: ShoppingCart },
          { name: 'Quotations', path: '/sales-rep?tab=quotations', icon: FileText },
          { name: 'Negotiations', path: '/sales-rep?tab=negotiations', icon: MessageSquare },
          { name: 'Orders', path: '/orders', icon: ShoppingBag },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Profile', path: '/sales-rep?tab=profile', icon: UserCheck },
        ];
      case 'SALES_MANAGER':
        return [
          { name: 'Dashboard', path: '/sales-manager', icon: LayoutDashboard },
          { name: 'Team Quotations', path: '/quotations', icon: FileText },
          { name: 'Approvals', path: '/approvals', icon: CheckSquare },
          { name: 'Orders Ledger', path: '/orders', icon: ShoppingBag },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Deal Health', path: '/deal-health', icon: Activity },
        ];
      case 'FINANCE_OPERATIONS':
        return [
          { name: 'Dashboard', path: '/finance', icon: LayoutDashboard },
          { name: 'High-Risk Approvals', path: '/approvals', icon: CheckSquare },
          { name: 'Orders Ledger', path: '/orders', icon: ShoppingBag },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Fulfillment & Stock', path: '/fulfillment', icon: Truck },
          { name: 'Invoices & Billing', path: '/invoices', icon: FileCheck2 },
          { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
        ];
      case 'CUSTOMER':
        return [
          { name: 'Dashboard', path: '/customer-portal?tab=dashboard', icon: LayoutDashboard },
          { name: 'Requests', path: '/customer-portal?tab=requests', icon: ShoppingCart },
          { name: 'Quotations', path: '/customer-portal?tab=quotations', icon: FileText },
          { name: 'Negotiation Corner', path: '/customer-portal?tab=negotiations', icon: MessageSquare },
          { name: 'My Orders', path: '/orders', icon: ShoppingBag },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Billing', path: '/customer-portal?tab=billing', icon: CreditCard },
          { name: 'Messages', path: '/customer-portal?tab=messages', icon: Send },
          { name: 'Profile', path: '/customer-portal?tab=profile', icon: UserCheck },
        ];
      case 'ADMIN':
        return [
          { name: 'Admin Console', path: '/admin', icon: LayoutDashboard },
          { name: 'Request & Platform History', path: '/admin?tab=requests_history', icon: FileCheck2 },
          { name: 'Approvals Audit Log', path: '/approvals', icon: CheckSquare },
          { name: 'Orders Ledger', path: '/orders', icon: ShoppingBag },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
          { name: 'Invoices & Billing', path: '/invoices', icon: FileCheck2 },
          { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
          { name: 'Deal Health', path: '/deal-health', icon: Activity },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside
      className={`bg-[#060911]/95 backdrop-blur-2xl border-r border-slate-800/80 min-h-screen flex flex-col justify-between transition-all duration-300 relative select-none z-40 shadow-2xl ${
        collapsed ? 'w-20 p-3' : 'w-64 p-4'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div>
        {/* Brand Logo */}
        <div className={`flex items-center gap-3 py-3 mb-5 border-b border-slate-800/80 ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base text-white tracking-tight leading-none flex items-center gap-1">
                DealFlow<span className="gradient-text-indigo">360</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase mt-1">Enterprise B2B SaaS</p>
            </div>
          )}
        </div>

        {/* Role Pill */}
        {!collapsed && (
          <div className="px-3 py-2 mb-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-inner">
            <span className="text-[11px] font-semibold text-slate-400">Active Role</span>
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 shadow-sm">
              {role.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Navigation Item List */}
        <nav className="space-y-1">
          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white border border-indigo-500/40 font-bold shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60 hover:border-slate-800 border border-transparent'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-indigo-400 scale-110' : 'text-slate-500'}`} />
                  {!collapsed && <span className="tracking-wide">{item.name}</span>}
                  {isActive && !collapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400 animate-pulse" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile & Logout Section at Bottom */}
      <div className={`pt-4 border-t border-slate-800/80 ${collapsed ? 'text-center' : ''}`}>
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all mx-auto"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
