import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, ShieldCheck, Sparkles, UserCheck, Sun, Moon, Key } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'ADMIN', label: 'System Admin', email: 'admin@dealflow360.com', pass: 'password123', color: 'border-rose-500/40 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20' },
    { role: 'SALES_MANAGER', label: 'Sales Manager', email: 'manager@dealflow360.com', pass: 'password123', color: 'border-purple-500/40 text-purple-500 bg-purple-500/10 hover:bg-purple-500/20' },
    { role: 'SALES_REP', label: 'Sales Representative', email: 'rahul@dealflow360.com', pass: 'password123', color: 'border-blue-500/40 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' },
    { role: 'FINANCE_OPERATIONS', label: 'Finance & Ops', email: 'finance@dealflow360.com', pass: 'password123', color: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' },
    { role: 'CUSTOMER', label: 'Customer Portal', email: 'customer@acmecorp.com', pass: 'password123', color: 'border-cyan-500/40 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20' },
  ];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectRole(user.role);
    } catch (err) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = async (demo) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setLoading(true);
    try {
      const user = await login(demo.email, demo.pass);
      redirectRole(user.role);
    } catch (err) {
      // Error handled
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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      
      {/* Top Right Theme Toggle Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="px-3.5 py-2 rounded-xl bg-card border border-border shadow-sm text-xs font-bold text-foreground hover:border-primary transition flex items-center gap-2"
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Dark Theme</span>
            </>
          )}
        </button>
      </div>

      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Hero Overview */}
        <div className="md:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Hackathon B2B Operations Engine
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                DealFlow<span className="text-primary">360</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground font-semibold">Automated Workflow Engine from Quotation → Approval → Fulfillment → Billing</p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Complete role-based SaaS platform with Customer $\rightarrow$ Admin $\rightarrow$ Sales Manager $\rightarrow$ Sales Rep assignment hierarchy, discount governance rules, 2-tier approval workflows, and split subscription/product billing.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs text-foreground font-semibold">
            <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Strict RBAC Security</span>
            </div>
            <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Discount Governance</span>
            </div>
          </div>
        </div>

        {/* Right Authentication & Demo Credentials Panel */}
        <div className="md:col-span-6 bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Sign In to DealFlow360</h2>
            <p className="text-xs text-muted-foreground font-medium">Enter your role credentials or select a demo account below</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@dealflow360.com"
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Accounts List Section */}
          <div className="pt-4 border-t border-border space-y-2.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" />
              Demo Credentials (1-Click Login)
            </p>

            <div className="space-y-1.5">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.role}
                  onClick={() => handleFillDemo(demo)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition ${demo.color}`}
                >
                  <div>
                    <p className="font-extrabold leading-tight">{demo.label}</p>
                    <p className="text-[10px] opacity-80 font-mono leading-tight">{demo.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold underline">Fill & Login $\rightarrow$</span>
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
