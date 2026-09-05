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
  ShieldAlert,
  Award
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
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Profile', path: '/sales-rep?tab=profile', icon: UserCheck },
        ];
      case 'SALES_MANAGER':
        return [
          { name: 'Dashboard', path: '/sales-manager', icon: LayoutDashboard },
          { name: 'Team Quotations', path: '/quotations', icon: FileText },
          { name: 'Approvals', path: '/approvals', icon: CheckSquare },
          { name: 'Closed Deals', path: '/closed-deals', icon: Award },
          { name: 'Deal Health', path: '/deal-health', icon: Activity },
        ];
      case 'FINANCE_OPERATIONS':
        return [
          { name: 'Dashboard', path: '/finance', icon: LayoutDashboard },
          { name: 'High-Risk Approvals', path: '/approvals', icon: CheckSquare },
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
      className={`bg-[#0D111A] border-r border-[#242C3A] min-h-screen flex flex-col justify-between transition-all duration-200 relative select-none z-40 ${
        collapsed ? 'w-20 p-3' : 'w-64 p-4'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-[#111722] border border-[#242C3A] text-[#A7B0C0] hover:text-[#F5F7FA] flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div>
        {/* Brand Logo */}
        <div className={`flex items-center gap-3 py-3 mb-5 border-b border-[#242C3A] ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#22D3EE] flex items-center justify-center shadow-md shadow-[#6366F1]/20 shrink-0">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base text-[#F5F7FA] tracking-tight leading-none flex items-center gap-1">
                DealFlow<span className="text-[#818CF8]">360</span>
              </h1>
              <p className="text-[9px] text-[#A7B0C0] font-semibold tracking-widest uppercase mt-1">Enterprise B2B SaaS</p>
            </div>
          )}
        </div>

        {/* Role Pill */}
        {!collapsed && (
          <div className="px-3 py-2 mb-4 rounded-xl bg-[#111722] border border-[#242C3A] flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#687386]">Active Role</span>
            <span className="text-[10px] font-extrabold text-[#818CF8] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/30">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#6366F1]/15 text-[#F5F7FA] border border-[#6366F1]/30 font-bold'
                    : 'text-[#A7B0C0] hover:text-[#F5F7FA] hover:bg-[#111722]/80'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#818CF8]' : 'text-[#687386]'}`} />
                  {!collapsed && <span>{item.name}</span>}
                  {isActive && !collapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#818CF8]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile & Logout Section at Bottom */}
      <div className={`pt-4 border-t border-[#242C3A] ${collapsed ? 'text-center' : ''}`}>
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-[#111722] border border-[#242C3A] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#F5F7FA] truncate">{user.name}</p>
                <p className="text-[10px] text-[#687386] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[#687386] hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/30 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-10 h-10 mx-auto rounded-xl bg-[#111722] border border-[#242C3A] text-[#687386] hover:text-[#EF4444] flex items-center justify-center transition"
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
