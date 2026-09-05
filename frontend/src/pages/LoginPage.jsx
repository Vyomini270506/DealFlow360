import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

const LoginPage = () => {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectRole(user.role);
    } catch (err) {
      // Handled in authContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setLoading(true);
    try {
      const user = await quickLogin(role);
      redirectRole(user.role);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const redirectRole = (role) => {
    const routes = {
      SALES_REP: '/sales-rep',
      SALES_MANAGER: '/sales-manager',
      FINANCE_OPERATIONS: '/finance',
      CUSTOMER: '/customer-portal',
      ADMIN: '/admin'
    };
    navigate(routes[role] || '/');
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Hero Pitch */}
        <div className="md:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Hackathon Demo Ready
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">DealFlow<span className="text-indigo-400">360</span></h1>
            </div>
            <p className="text-sm text-slate-300 font-medium">Intelligent B2B Sales Operations & Workflow Platform</p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Automating the complete B2B SaaS deal lifecycle: Quotation → Discount Governance → Transparent Risk Scoring → Sales Manager & High-Risk Finance Approvals → Multi-Warehouse Fulfillment → Partial Delivery Invoicing.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>RBAC Role Dashboards</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Discount Governance</span>
            </div>
          </div>
        </div>

        {/* Right Auth & Quick Login Panel */}
        <div className="md:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold text-white">Sign In to DealFlow360</h2>
            <p className="text-xs text-slate-400">Enter user credentials or select a 1-click Quick Login role</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@dealflow360.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login Role Selector Buttons for Hackathon Demo */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              1-Click Demo Quick Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'SALES_REP', label: 'Login as Sales Rep', bg: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/60' },
                { role: 'SALES_MANAGER', label: 'Login as Sales Manager', bg: 'bg-purple-950/60 border-purple-800/60 text-purple-300 hover:bg-purple-900/60' },
                { role: 'FINANCE_OPERATIONS', label: 'Login as Finance', bg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60' },
                { role: 'CUSTOMER', label: 'Login as Customer', bg: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/60' },
                { role: 'ADMIN', label: 'Login as Admin', bg: 'bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900/60' },
              ].map((btn) => (
                <button
                  key={btn.role}
                  onClick={() => handleQuickLogin(btn.role)}
                  className={`p-2 rounded-lg border text-[11px] font-bold text-center transition ${btn.bg} ${btn.role === 'ADMIN' ? 'col-span-2' : ''}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default LoginPage;
