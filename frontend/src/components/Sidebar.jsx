import React from 'react';
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
  Settings, 
  MessageSquare,
  Users,
  Briefcase,
  ShoppingCart,
  CreditCard,
  UserCheck,
  Send
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Common links based on role
  const getNavLinks = () => {
    switch (role) {
      case 'SALES_REP':
        return [
          { name: 'Dashboard', path: '/sales-rep', icon: LayoutDashboard },
          { name: 'My Quotations', path: '/quotations', icon: FileText },
          { name: 'Customer Negotiations', path: '/negotiations', icon: MessageSquare },
          { name: 'Fulfillment Status', path: '/fulfillment', icon: Truck },
        ];
      case 'SALES_MANAGER':
        return [
          { name: 'Dashboard', path: '/sales-manager', icon: LayoutDashboard },
          { name: 'Team Quotations', path: '/quotations', icon: FileText },
          { name: 'Pending Approvals', path: '/approvals', icon: CheckSquare },
          { name: 'Deal Health', path: '/deal-health', icon: Activity },
        ];
      case 'FINANCE_OPERATIONS':
        return [
          { name: 'Dashboard', path: '/finance', icon: LayoutDashboard },
          { name: 'High-Risk Approvals', path: '/approvals', icon: CheckSquare },
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
          { name: 'Billing', path: '/customer-portal?tab=billing', icon: CreditCard },
          { name: 'Messages', path: '/customer-portal?tab=messages', icon: Send },
          { name: 'Profile', path: '/customer-portal?tab=profile', icon: UserCheck },
        ];
      case 'ADMIN':
        return [
          { name: 'Admin Console', path: '/admin', icon: LayoutDashboard },
          { name: 'All Quotations', path: '/quotations', icon: FileText },
          { name: 'Approvals Queue', path: '/approvals', icon: CheckSquare },
          { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
          { name: 'Billing & Invoices', path: '/invoices', icon: FileCheck2 },
          { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
          { name: 'Deal Health', path: '/deal-health', icon: Activity },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 min-h-screen flex flex-col justify-between p-4 select-none">
      <div>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight leading-none">DealFlow<span className="text-indigo-400">360</span></h1>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-1">Sales Ops AI Platform</p>
          </div>
        </div>

        {/* User Active Role Pill */}
        <div className="px-3 py-2 mb-4 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Role</span>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
            {role.replace('_', ' ')}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-900/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">DealFlow360 Enterprise</p>
        <p className="mt-0.5">Automated B2B Operations Engine v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
