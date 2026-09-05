import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, ShieldCheck, Sparkles, UserCheck, Key, Lock, Mail, Building2, UserPlus, CheckCircle2, Eye, EyeOff, KeyRound, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const { login, sendOtp, register, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Auth Mode: 'signin' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('signin');

  // Password Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCompany, setRegCompany] = useState('');
  const [regRole, setRegRole] = useState('CUSTOMER');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [sendingRegOtp, setSendingRegOtp] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [selectedDemoRoleFilter, setSelectedDemoRoleFilter] = useState('ALL');

  const demoAccounts = [
    { role: 'ADMIN', label: 'Admin User', email: 'admin@dealflow360.com', pass: 'password123' },
    { role: 'SALES_MANAGER', label: 'Sales Manager A', email: 'manager.a@dealflow360.com', pass: 'password123' },
    { role: 'SALES_MANAGER', label: 'Sales Manager B', email: 'manager.b@dealflow360.com', pass: 'password123' },
    { role: 'SALES_REP', label: 'Sales Rep A', email: 'salesrep.a@dealflow360.com', pass: 'password123' },
    { role: 'SALES_REP', label: 'Sales Rep B', email: 'salesrep.b@dealflow360.com', pass: 'password123' },
    { role: 'SALES_REP', label: 'Sales Rep C', email: 'salesrep.c@dealflow360.com', pass: 'password123' },
    { role: 'FINANCE_OPERATIONS', label: 'Finance/Operations A', email: 'finance.a@dealflow360.com', pass: 'password123' },
    { role: 'FINANCE_OPERATIONS', label: 'Finance/Operations B', email: 'finance.b@dealflow360.com', pass: 'password123' },
    { role: 'CUSTOMER', label: 'Customer A (Acme Corp)', email: 'customer.a@acmecorp.com', pass: 'password123' },
    { role: 'CUSTOMER', label: 'Customer B (TechNova)', email: 'customer.b@technova.io', pass: 'password123' },
    { role: 'CUSTOMER', label: 'Customer C (Global Systems)', email: 'customer.c@globalsys.com', pass: 'password123' },
    { role: 'CUSTOMER', label: 'Customer D (Urban Retail)', email: 'customer.d@urbanretail.in', pass: 'password123' },
  ];

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

  const handlePasswordLogin = async (e) => {
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

  const handleSendRegOtp = async () => {
    if (!regEmail.trim()) {
      toast.error('Please enter your email address to receive OTP');
      return;
    }
    setSendingRegOtp(true);
    try {
      await sendOtp(regEmail, 'REGISTER');
      setRegOtpSent(true);
    } catch (err) {
      // Error handled
    } finally {
      setSendingRegOtp(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regCompany.trim()) {
      toast.error('Company / Organization name is required');
      return;
    }
    if (!regOtpSent) {
      toast.error('Please request an OTP verification code first');
      return;
    }
    setLoading(true);
    try {
      const newUser = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        company: regCompany,
        role: regRole,
        otp: regOtp
      });
      redirectRole(newUser.role);
    } catch (err) {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered email address');
      return;
    }
    setSendingForgotOtp(true);
    try {
      await sendOtp(forgotEmail, 'FORGOT_PASSWORD');
      setForgotOtpSent(true);
    } catch (err) {
      // Error handled
    } finally {
      setSendingForgotOtp(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtpSent) {
      toast.error('Please request an OTP verification code first');
      return;
    }
    if (!forgotOtp) {
      toast.error('Please enter the OTP verification code');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(forgotEmail, forgotOtp, newPassword);
      setAuthMode('signin');
      setEmail(forgotEmail);
    } catch (err) {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = async (demo) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setAuthMode('signin');
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

  return (
    <div className="min-h-screen bg-[#080B12] text-[#F5F7FA] flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#22D3EE]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Hero Overview */}
        <div className="md:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#818CF8] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Sales Operations & Authentication Engine
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
                DealFlow<span className="text-[#818CF8]">360</span>
              </h1>
            </div>
            <p className="text-sm text-[#A7B0C0] font-semibold">Automated Sales Engine with OTP Email Verification</p>
          </div>

          <p className="text-xs text-[#687386] leading-relaxed font-medium">
            Sign in with your registered account or create a new account verified via OTP sent directly to your Gmail inbox. Supports corporate Customer, Sales Rep, Sales Manager, and Finance/Ops role routing.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs text-[#F5F7FA] font-semibold">
            <div className="flex items-center gap-2 bg-[#111722] p-3 rounded-xl border border-[#242C3A]">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>OTP Email Security</span>
            </div>
            <div className="flex items-center gap-2 bg-[#111722] p-3 rounded-xl border border-[#242C3A]">
              <UserPlus className="w-4 h-4 text-[#818CF8]" />
              <span>Self-Service Registration</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="md:col-span-6 bg-[#111722] border border-[#242C3A] rounded-2xl p-6 shadow-2xl space-y-6">
          
          {/* 2 Main Options Tabs: Sign In vs Create Account */}
          <div className="flex items-center gap-1 bg-[#161D29] p-1 rounded-xl border border-[#242C3A]">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                authMode === 'signin' ? 'bg-[#6366F1] text-white shadow' : 'text-[#A7B0C0] hover:text-[#F5F7FA]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                authMode === 'register' ? 'bg-[#6366F1] text-white shadow' : 'text-[#A7B0C0] hover:text-[#F5F7FA]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* OPTION 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#F5F7FA]">Sign In to Your Account</h2>
                <p className="text-xs text-[#A7B0C0]">Enter your registered email and password</p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A7B0C0] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@dealflow360.com"
                    className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl px-3.5 py-2 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-[#A7B0C0]">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setAuthMode('forgot');
                      }}
                      className="text-[#818CF8] hover:underline font-semibold text-[11px]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl pl-3.5 pr-10 py-2 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#A7B0C0] transition"
                      title={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* OPTION 2: CREATE ACCOUNT WITH OTP VERIFICATION & SHOW/HIDE PASSWORD */}
          {authMode === 'register' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#F5F7FA]">Create Account with OTP Verification</h2>
                <p className="text-xs text-[#A7B0C0]">Verification code will be sent to your email inbox</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">Company / Organization *</label>
                    <input
                      type="text"
                      required
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. your_email@gmail.com"
                      className="flex-1 bg-[#161D29] border border-[#242C3A] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendRegOtp}
                      disabled={sendingRegOtp || !regEmail.trim()}
                      className="px-3 py-1.5 bg-[#6366F1]/20 hover:bg-[#6366F1]/30 border border-[#6366F1]/40 text-[#818CF8] font-bold text-xs rounded-xl transition shrink-0"
                    >
                      {sendingRegOtp ? 'Sending...' : regOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {regOtpSent && (
                  <div className="animate-fade-in space-y-1">
                    <label className="block text-[11px] font-semibold text-[#818CF8] mb-1">Enter 6-Digit OTP Code Sent to Email</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-[#161D29] border border-[#6366F1] rounded-xl px-3 py-1.5 text-sm text-[#F5F7FA] font-mono tracking-widest text-center font-bold placeholder-[#687386] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl pl-3 pr-8 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#A7B0C0] transition"
                      title={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !regOtpSent || !regOtp}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Creating Account...' : 'Verify OTP & Create Account'}</span>
                </button>
              </form>
            </div>
          )}

          {/* OPTION 3: FORGOT PASSWORD WITH OTP VERIFICATION & SHOW/HIDE PASSWORD */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#F5F7FA]">Reset Password via OTP</h2>
                <p className="text-xs text-[#A7B0C0]">Enter your registered email to receive a password reset code</p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">Registered Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. your_email@gmail.com"
                      className="flex-1 bg-[#161D29] border border-[#242C3A] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={sendingForgotOtp || !forgotEmail.trim()}
                      className="px-3 py-1.5 bg-[#6366F1]/20 hover:bg-[#6366F1]/30 border border-[#6366F1]/40 text-[#818CF8] font-bold text-xs rounded-xl transition shrink-0"
                    >
                      {sendingForgotOtp ? 'Sending...' : forgotOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {forgotOtpSent && (
                  <div className="animate-fade-in space-y-1">
                    <label className="block text-[11px] font-semibold text-[#818CF8] mb-1">Enter 6-Digit Reset Code Sent to Email</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-[#161D29] border border-[#6366F1] rounded-xl px-3 py-1.5 text-sm text-[#F5F7FA] font-mono tracking-widest text-center font-bold placeholder-[#687386] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#A7B0C0] mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#161D29] border border-[#242C3A] rounded-xl pl-3 pr-8 py-1.5 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#A7B0C0] transition"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !forgotOtpSent || !forgotOtp || !newPassword}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Updating Password...' : 'Verify OTP & Reset Password'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-xs text-[#A7B0C0] hover:text-[#F5F7FA] underline transition font-medium"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Demo Accounts List Section (12 Demo Accounts) */}
          <div className="pt-4 border-t border-[#242C3A] space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#687386] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#818CF8]" />
                Demo Accounts (1-Click Login)
              </p>
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-bold">
              {['ALL', 'CUSTOMER', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedDemoRoleFilter(r)}
                  className={`px-2 py-0.5 rounded-full border transition shrink-0 ${
                    selectedDemoRoleFilter === r ? 'bg-[#6366F1] text-white border-[#6366F1]' : 'bg-[#161D29] text-[#A7B0C0] border-[#242C3A] hover:text-[#F5F7FA]'
                  }`}
                >
                  {r === 'ALL' ? 'All (12)' : r.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {demoAccounts
                .filter(d => selectedDemoRoleFilter === 'ALL' || d.role === selectedDemoRoleFilter)
                .map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleFillDemo(demo)}
                    className="w-full p-2.5 rounded-xl bg-[#161D29] border border-[#242C3A] hover:border-[#6366F1] text-left text-xs font-semibold flex items-center justify-between transition group"
                  >
                    <div>
                      <p className="font-bold text-[#F5F7FA] leading-tight">{demo.label}</p>
                      <p className="text-[10px] text-[#687386] font-mono leading-tight">{demo.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#818CF8] group-hover:underline">Login →</span>
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
