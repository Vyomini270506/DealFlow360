import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import QuotationModal from '../components/QuotationModal';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  MessageSquare, 
  UserCheck, 
  Plus, 
  Send, 
  Eye, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  ArrowRight, 
  IndianRupee, 
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  Trash2,
  CreditCard,
  Repeat
} from 'lucide-react';
import { toast } from 'sonner';

const SalesRepDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [quotations, setQuotations] = useState([]);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);
  const [selectedRequestModal, setSelectedRequestModal] = useState(null);
  const [selectedQuotationView, setSelectedQuotationView] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [qRes, reqRes, negRes, invRes, subRes] = await Promise.all([
        API.get('/quotations'),
        API.get('/customer-requests').catch(() => ({ data: [] })),
        API.get('/negotiations/sales-rep').catch(() => ({ data: [] })),
        API.get('/invoices').catch(() => ({ data: [] })),
        API.get('/subscriptions').catch(() => ({ data: [] }))
      ]);

      setQuotations(qRes.data || []);
      setCustomerRequests(reqRes.data || []);
      setNegotiations(negRes.data || []);
      setInvoices(invRes.data || []);
      setSubscriptions(subRes.data || []);
    } catch (err) {
      toast.error('Failed to load Sales Representative dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotationFromRequest = async (requestId) => {
    try {
      const { data } = await API.post(`/customer-requests/${requestId}/create-quotation`, {});
      toast.success('Quotation created from request and sent to Customer successfully!');
      fetchDashboardData();
      setActiveTab('quotations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleSendQuotation = async (quoteId) => {
    try {
      await API.post(`/quotations/${quoteId}/send`);
      toast.success('Quotation sent to Customer successfully!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send quotation');
    }
  };

  const handleStartNegotiationFromRequest = async (requestId) => {
    try {
      const { data } = await API.post(`/customer-requests/${requestId}/start-negotiation`, {});
      toast.success(data.message || 'Negotiation started successfully');
      const negId = data.negotiation?._id || data._id;
      if (negId) {
        setActiveNegotiationId(negId);
      }
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start negotiation');
    }
  };

  const handleRepActionOnRequest = async (requestId, action) => {

    try {
      const { data } = await API.post(`/customer-requests/${requestId}/rep-action`, { action });
      if (action === 'APPROVE') toast.success('Product Request approved! You can now generate a quotation.');
      else if (action === 'REJECT') toast.info('Product Request rejected.');
      else toast.info('Product Request sent to Sales Manager for approval!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request action');
    }
  };

  const handleSubmitForApproval = async (quoteId) => {
    try {
      await API.post(`/quotations/${quoteId}/submit`);
      toast.success('Customer Request & Quotation sent to Sales Manager for approval!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit for manager approval');
    }
  };

  const handleAcceptNegotiationDirectly = async (quotationId) => {
    try {
      await API.post(`/negotiations/quotation/${quotationId}/accept`);
      toast.success('Negotiation counter-offer accepted! Quotation confirmed.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept negotiation');
    }
  };

  const handleEscalateNegotiationToManager = async (quotationId) => {
    try {
      await API.post(`/negotiations/quotation/${quotationId}/escalate-manager`, {
        reason: 'Discount/Risk score exceeds Sales Rep authority'
      });
      toast.info('Negotiation sent to Sales Manager for approval!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Escalation failed');
    }
  };

  const handleDiscardRequest = async (requestId) => {
    try {
      await API.post(`/customer-requests/${requestId}/discard`);
      toast.info('Request discarded and moved to Discarded Records.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard request');
    }
  };

  const handleDiscardQuotation = async (quotationId) => {
    try {
      await API.post(`/quotations/${quotationId}/discard`);
      toast.info('Quotation discarded and moved to Discarded Records.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard quotation');
    }
  };

  const activeCustomerRequests = customerRequests.filter(r => r.status !== 'DISCARDED' && r.status !== 'Closed' && r.status !== 'CLOSED');
  const activeQuotationsList = quotations.filter(q => q.status !== 'DISCARDED' && q.status !== 'Closed' && q.status !== 'CLOSED');
  const activeNegotiationsList = negotiations.filter(n => n.quotation && n.status !== 'INACTIVE' && n.status !== 'Closed' && n.status !== 'CLOSED' && n.quotation?.status !== 'Closed' && n.quotation?.status !== 'CLOSED');
  const closedQuotationsList = quotations.filter(q => q.status === 'Closed' || q.status === 'CLOSED');

  const pendingApprovalsCount = activeQuotationsList.filter(q => q.status === 'Pending Approval').length;
  const atRiskDealsCount = activeQuotationsList.filter(q => q.riskLevel === 'HIGH' || q.riskScore >= 60).length;
  const pipelineValue = activeQuotationsList.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-indigo-600/15 via-card to-cyan-500/15 p-6 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-primary uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30">
              Sales Representative Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-1.5">Sales Representative Workspace</h1>
          <p className="text-xs text-muted-foreground font-medium">Review customer requests, issue official quotations, and manage discount negotiations</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> + Create Direct Quotation
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'requests' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Customer Requests</span>
          {activeCustomerRequests.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{activeCustomerRequests.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'quotations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quotations</span>
          {activeQuotationsList.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{activeQuotationsList.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('negotiations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'negotiations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Negotiations</span>
          {activeNegotiationsList.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold">{activeNegotiationsList.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('closed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'closed' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-500 hover:text-emerald-400 hover:bg-card/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Closed Deals</span>
          {closedQuotationsList.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{closedQuotationsList.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'billing' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Billing & Subscriptions</span>
          {invoices.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{invoices.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('discarded')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'discarded' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-400 hover:text-rose-300 hover:bg-card/50'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Discarded Records</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD (OVERVIEW) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Assigned Product Requests" value={activeCustomerRequests.length} subtitle="Assigned via workload" icon={ShoppingCart} color="indigo" />
            <KPICard title="My Active Pipeline" value={`₹${(pipelineValue / 100000).toFixed(1)}L`} subtitle="All active deals" icon={IndianRupee} color="cyan" />
            <KPICard title="Pending Approvals" value={pendingApprovalsCount} subtitle="Awaiting manager signoff" icon={Clock} color="amber" />
            <KPICard title="Active Negotiations" value={activeNegotiationsList.length} subtitle="Customer discount counter-offers" icon={MessageSquare} color="emerald" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Requests Quick View */}
            <div className="glass-panel p-5 rounded-2xl border border-border space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    Incoming Product Requests
                  </h3>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All ({activeCustomerRequests.length}) <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {activeCustomerRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No assigned customer product requests.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {activeCustomerRequests.slice(0, 3).map((r) => (
                      <div key={r._id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-primary">{r.requestNumber}</p>
                          <p className="text-[11px] font-semibold text-foreground">{r.customer?.company || r.customer?.name}</p>
                        </div>
                        <button
                          onClick={() => handleCreateQuotationFromRequest(r._id)}
                          className="px-2.5 py-1 rounded-lg bg-primary text-white font-bold text-[11px] shadow"
                        >
                          Create Quote
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Negotiations Quick View */}
            <div className="glass-panel p-5 rounded-2xl border border-border space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    Pending Discount Negotiations
                  </h3>
                  <button 
                    onClick={() => setActiveTab('negotiations')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All ({activeNegotiationsList.length}) <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {activeNegotiationsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No active negotiation threads.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {activeNegotiationsList.slice(0, 3).map((n) => (
                      <div key={n._id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">{n.quotation?.quoteNumber || `Request #${n.customerRequest?.requestNumber}`}</p>
                          <p className="text-[11px] text-muted-foreground">{n.customer?.company || n.customer?.name || ''}</p>
                        </div>
                        <button
                          onClick={() => setActiveNegotiationId(n._id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] shadow"
                        >
                          Review Thread
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Assigned Customer Product Requests
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Requests automatically assigned to you based on active workload balancing. Review customer requirements and issue official quotations.</p>
          </div>

          {activeCustomerRequests.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground">No customer product requests currently assigned.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Request Ref</th>
                    <th className="p-3.5">Customer / Company</th>
                    <th className="p-3.5">Products Requested</th>
                    <th className="p-3.5">Desired Discount %</th>
                    <th className="p-3.5">Risk Assessment</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {activeCustomerRequests.map((reqItem) => {
                    const isQuoted = reqItem.status === 'Quoted';
                    return (
                      <tr key={reqItem._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-bold text-primary">{reqItem.requestNumber}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{reqItem.customer?.company || reqItem.customer?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{reqItem.customer?.tier || 'Gold'} Tier</p>
                        </td>
                        <td className="p-3.5">
                          {reqItem.items?.map((i, idx) => (
                            <div key={idx} className="text-xs font-medium">
                              <span className="font-bold text-foreground">{i.quantity}x</span> {i.product?.name || 'Product'}
                            </div>
                          ))}
                        </td>
                        <td className="p-3.5 font-extrabold text-foreground">
                          {reqItem.items?.map(i => `${i.desiredDiscountPercent}%`).join(', ')}
                        </td>
                        <td className="p-3.5">
                          <RiskBadge level={reqItem.riskLevel} score={reqItem.riskScore} />
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isQuoted ? 'bg-success/10 text-success border border-success/30' : 'bg-primary/10 text-primary border border-primary/30'
                          }`}>
                            {reqItem.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedRequestModal(reqItem)}
                            className="px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" /> View Details
                          </button>

                          {/* QUOTED */}
                          {reqItem.status === 'Quoted' && (
                            <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                              ✓ Quotation Generated & Sent
                            </span>
                          )}

                          {/* MANAGER APPROVED */}
                          {reqItem.status === 'Approved_Manager' && (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                                MANAGER APPROVED ✓
                              </span>
                              <button
                                onClick={() => handleCreateQuotationFromRequest(reqItem._id)}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                              >
                                <Send className="w-3.5 h-3.5" /> Create Quotation
                              </button>
                            </div>
                          )}

                          {/* MANAGER REJECTED */}
                          {reqItem.status === 'Rejected_Manager' && (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30">
                                MANAGER REJECTED ✗
                              </span>
                              {reqItem.managerComment && (
                                <span className="text-[10px] text-muted-foreground italic">"{reqItem.managerComment}"</span>
                              )}
                            </div>
                          )}

                          {/* NEGOTIATION REQUIRED / CHANGES REQUESTED BY MANAGER */}
                          {reqItem.status === 'Negotiation_Required' && (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                                Manager requested negotiation 💬
                              </span>
                              {reqItem.managerComment && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">Manager Note: "{reqItem.managerComment}"</span>
                              )}
                              <button
                                onClick={() => handleStartNegotiationFromRequest(reqItem._id)}
                                className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Start Negotiation
                              </button>
                            </div>
                          )}


                          {/* ESCALATED / WAITING FOR SALES MANAGER */}
                          {reqItem.status === 'Escalated_Manager' && (
                            <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> WAITING FOR SALES MANAGER
                            </span>
                          )}

                          {/* APPROVED BY REP */}
                          {reqItem.status === 'Approved_Rep' && (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                                Approved by Rep ✓
                              </span>
                              <button
                                onClick={() => handleCreateQuotationFromRequest(reqItem._id)}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                              >
                                <Send className="w-3.5 h-3.5" /> Create Quotation
                              </button>
                            </div>
                          )}

                          {/* REJECTED BY REP */}
                          {reqItem.status === 'Rejected_Rep' && (
                            <span className="text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30">
                              Rejected by Rep ✗
                            </span>
                          )}

                          {/* INITIAL PENDING / SUBMITTED STATE */}
                          {(reqItem.status === 'Pending' || reqItem.status === 'Submitted' || reqItem.status === 'Processing') && (
                            <>
                              {/* LOW RISK OPTIONS */}
                              {reqItem.riskLevel === 'LOW' && (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleRepActionOnRequest(reqItem._id, 'APPROVE')}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRepActionOnRequest(reqItem._id, 'REJECT')}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                  <button
                                    onClick={() => handleRepActionOnRequest(reqItem._id, 'SEND_TO_MANAGER')}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1"
                                  >
                                    <ArrowRight className="w-3 h-3" /> Send to Manager
                                  </button>
                                </div>
                              )}

                              {/* MEDIUM / HIGH RISK COMPULSORY MANAGER APPROVAL */}
                              {(reqItem.riskLevel === 'MEDIUM' || reqItem.riskLevel === 'HIGH') && (
                                <div className="inline-flex flex-col items-end gap-1">
                                  <span className="text-[9px] text-rose-500 font-bold">Manager approval required before quotation</span>
                                  <button
                                    onClick={() => handleRepActionOnRequest(reqItem._id, 'SEND_TO_MANAGER')}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" /> SEND TO SALES MANAGER
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => handleDiscardRequest(reqItem._id)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold inline-flex items-center gap-1 transition ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Discard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Quotations & Pipeline
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage and send official sales proposals created for your assigned customers</p>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> + Create Direct Quotation
            </button>
          </div>

          {activeQuotationsList.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground">No active quotations created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Quote Ref</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Grand Total</th>
                    <th className="p-3.5">Risk Score</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {activeQuotationsList.map((q) => (
                    <tr key={q._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-bold text-foreground">{q.quoteNumber}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{q.customer?.company || q.customer?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{q.customer?.tier || 'Gold'} Tier</p>
                      </td>
                      <td className="p-3.5 font-extrabold text-primary text-sm">₹{q.grandTotal?.toLocaleString()}</td>
                      <td className="p-3.5">
                        <RiskBadge level={q.riskLevel} score={q.riskScore} />
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedQuotationView(q)}
                          className="px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" /> View
                        </button>

                        {q.status === 'Draft' && (
                          <>
                            {/* LOW RISK: Sales Rep can proceed directly OR optionally send to Manager */}
                            {q.riskLevel === 'LOW' && (
                              <>
                                <button
                                  onClick={() => handleSendQuotation(q._id)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                                >
                                  <Send className="w-3.5 h-3.5" /> PROCEED (Send to Customer)
                                </button>
                                <button
                                  onClick={() => handleSubmitForApproval(q._id)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" /> SEND TO SALES MANAGER
                                </button>
                              </>
                            )}

                            {/* MEDIUM / HIGH RISK: Sales Manager Approval is COMPULSORY */}
                            {(q.riskLevel === 'MEDIUM' || q.riskLevel === 'HIGH') && (
                              <button
                                onClick={() => handleSubmitForApproval(q._id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                              >
                                <ArrowRight className="w-3.5 h-3.5" /> SEND TO SALES MANAGER (Required)
                              </button>
                            )}
                          </>
                        )}

                        {q.status === 'Approved' && (
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                              Manager Approved ✓
                            </span>
                            <button
                              onClick={() => handleSendQuotation(q._id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                            >
                              <Send className="w-3.5 h-3.5" /> SEND TO CUSTOMER
                            </button>
                          </div>
                        )}

                        {q.status === 'Rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                            Manager Rejected ✗
                          </span>
                        )}

                        {q.status === 'Pending Approval' && (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                              Pending Sales Manager Approval
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">Manager approval required before customer send</span>
                          </div>
                        )}

                        <button
                          onClick={() => setActiveNegotiationId(q._id)}
                          className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs inline-flex items-center gap-1 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Negotiation Q&A
                        </button>
                        
                        <button
                          onClick={() => handleDiscardQuotation(q._id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold inline-flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Discard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: NEGOTIATIONS */}
      {activeTab === 'negotiations' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-amber-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Customer Discount Negotiations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Evaluate customer counter-discount requests against dynamically calculated tier & category limits</p>
          </div>

          {activeNegotiationsList.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground">No active customer negotiation threads found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeNegotiationsList.map((neg) => {
                const q = neg.quotation;
                if (!q) return null;
                const isPendingManager = neg.status === 'PENDING_MANAGER_APPROVAL' || q.status === 'Pending Approval';
                const isLowRisk = q.riskLevel === 'LOW' && q.riskScore < 30;

                return (
                  <div key={neg._id} className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-amber-500/50 transition">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <span className="text-xs font-bold text-primary">{q.quoteNumber}</span>
                        <p className="text-[11px] text-muted-foreground font-semibold">Customer: {neg.customer?.company || neg.customer?.name}</p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                        <span className="text-muted-foreground">Customer Proposed Discount:</span>
                        <span className="font-extrabold text-amber-500">{neg.currentRequestedDiscount || 0}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Risk Level & Score:</span>
                        <RiskBadge level={q.riskLevel} score={q.riskScore} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        onClick={() => setActiveNegotiationId(q._id)}
                        className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> View Thread
                      </button>

                      {isPendingManager ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          Waiting for Sales Manager
                        </span>
                      ) : isLowRisk ? (
                        <button
                          onClick={() => handleAcceptNegotiationDirectly(q._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept Counter-Offer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEscalateNegotiationToManager(q._id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Send to Sales Manager
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CLOSED DEALS */}
      {activeTab === 'closed' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-emerald-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Closed Deals & Finalized Sales
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Successfully closed deals where both Customer and Sales Representative confirmed the final quotation terms.
            </p>
          </div>

          {closedQuotationsList.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-muted-foreground">No closed deals yet. Complete dual confirmation to finalize deals.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Quotation Ref</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Sales Rep</th>
                    <th className="p-3.5">Products</th>
                    <th className="p-3.5">Final Discount %</th>
                    <th className="p-3.5">Final Amount</th>
                    <th className="p-3.5">Confirmation Time</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {closedQuotationsList.map((q) => (
                    <tr key={q._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-bold text-primary">{q.quoteNumber}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{q.customer?.company || q.customer?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{q.customer?.email}</p>
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {q.salesRep?.name || 'Sales Rep'}
                      </td>
                      <td className="p-3.5">
                        {q.items?.map((item, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-bold">{item.quantity}x</span> {item.product?.name || 'Product'}
                          </div>
                        ))}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-500">
                        {q.items?.[0]?.discountPercent ?? 0}%
                      </td>
                      <td className="p-3.5 font-extrabold text-foreground text-sm">
                        ₹{q.grandTotal?.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {q.updatedAt ? new Date(q.updatedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          CLOSED ✓
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setActiveNegotiationId(q._id)}
                          className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs inline-flex items-center gap-1 transition shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Negotiation History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: BILLING & SUBSCRIPTIONS */}
      {activeTab === 'billing' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Customer Invoices & Recurring Subscriptions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">View billing records, payment status, delivery status, and subscriptions belonging strictly to your assigned customer accounts.</p>
          </div>

          {/* Subscriptions Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-500" />
              Assigned Customer Subscriptions ({subscriptions.length})
            </h3>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No active subscriptions for your assigned customers.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Ref</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Service Plan</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Billing Cycle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Next Billing Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {subscriptions.map(s => (
                      <tr key={s._id} className="hover:bg-muted/50 transition">
                        <td className="p-3 font-mono font-bold text-primary">{s.subscriptionNumber}</td>
                        <td className="p-3 font-bold text-foreground">{s.customer?.company || s.customer?.name}</td>
                        <td className="p-3 font-semibold">{s.planName}</td>
                        <td className="p-3 font-extrabold text-emerald-500">₹{s.amount?.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{s.billingFrequency || s.billingCycle}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            s.status === 'ACTIVE' || s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Product Invoices Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Assigned Customer Invoices ({invoices.length})
            </h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No invoices issued for your assigned customers.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Invoice Ref</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items Shipped</th>
                      <th className="p-3">Grand Total</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">Delivery Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {invoices.map(inv => (
                      <tr key={inv._id} className="hover:bg-muted/50 transition">
                        <td className="p-3 font-bold text-primary">{inv.invoiceNumber}</td>
                        <td className="p-3 font-bold text-foreground">{inv.customer?.company || inv.customer?.name}</td>
                        <td className="p-3">
                          {inv.items?.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-bold">{item.shippedQuantity}x</span> {item.product?.name || 'Product'}
                            </div>
                          ))}
                        </td>
                        <td className="p-3 font-extrabold text-foreground text-sm">₹{inv.grandTotal?.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'PAID' || inv.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.deliveryStatus === 'DELIVERED' || inv.deliveryStatus === 'SHIPPED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {inv.deliveryStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === 'profile' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Sales Representative Profile
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your official employee account and assigned workload capacity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3 text-xs">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Employee Account Info</h3>
              <p><span className="text-muted-foreground font-semibold">Role:</span> <strong className="text-primary uppercase">Sales Representative</strong></p>
              <p><span className="text-muted-foreground font-semibold">Assigned Customer Requests:</span> <strong className="text-foreground">{customerRequests.length} Requests</strong></p>
              <p><span className="text-muted-foreground font-semibold">Active Deals in Pipeline:</span> <strong className="text-foreground">{quotations.length} Quotations</strong></p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3 text-xs">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Workload Balancing Algorithm</h3>
              <p className="text-muted-foreground">New customer product requests are automatically assigned to your account when your active workload count is lowest among team representatives.</p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                  Least-Workload Assignment Engine Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DISCARDED RECORDS */}
      {activeTab === 'discarded' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-rose-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Discarded Records & Soft-Deleted Items
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Archived requests and quotations. Soft-deleted from active workflows while maintaining complete audit logs in MongoDB.</p>
          </div>

          {/* Discarded Customer Requests */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Discarded Customer Requests</h3>
            {customerRequests.filter(r => r.status === 'DISCARDED').length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No discarded customer requests.</p>
            ) : (
              <div className="space-y-2">
                {customerRequests.filter(r => r.status === 'DISCARDED').map(reqItem => (
                  <div key={reqItem._id} className="p-3.5 rounded-xl bg-card border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-400">{reqItem.requestNumber}</span> — <span className="font-bold text-foreground">{reqItem.customer?.company || reqItem.customer?.name}</span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Products: {reqItem.items?.map(i => `${i.quantity}x ${i.product?.name || 'Product'}`).join(', ')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      DISCARDED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discarded Quotations */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Discarded Quotations</h3>
            {quotations.filter(q => q.status === 'DISCARDED').length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No discarded quotations.</p>
            ) : (
              <div className="space-y-2">
                {quotations.filter(q => q.status === 'DISCARDED').map(q => (
                  <div key={q._id} className="p-3.5 rounded-xl bg-card border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-400">{q.quoteNumber}</span> — <span className="font-bold text-foreground">{q.customer?.company || q.customer?.name}</span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">Grand Total: ₹{q.grandTotal?.toLocaleString()}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      DISCARDED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER REQUEST DETAIL MODAL */}
      {selectedRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Product Request ({selectedRequestModal.requestNumber})
                </h3>
                <p className="text-xs text-muted-foreground">Submitted by {selectedRequestModal.customer?.company || selectedRequestModal.customer?.name}</p>
              </div>
              <button
                onClick={() => setSelectedRequestModal(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-muted-foreground">Customer Email:</span>
                <p className="font-semibold text-foreground">{selectedRequestModal.customer?.email}</p>
              </div>

              <div>
                <span className="font-bold text-muted-foreground">Requested Products & Quantities:</span>
                <div className="space-y-1 mt-1">
                  {selectedRequestModal.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.quantity}x {item.product?.name || 'Product'}</span>
                      <span className="font-bold text-primary">Desired Discount: {item.desiredDiscountPercent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRequestModal.message && (
                <div>
                  <span className="font-bold text-muted-foreground">Customer Message:</span>
                  <p className="p-2.5 rounded-xl bg-muted/40 text-foreground italic border border-border mt-1">"{selectedRequestModal.message}"</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground">Risk Level & Score:</span>
                  <p className="font-extrabold text-foreground">{selectedRequestModal.riskLevel || 'LOW'} (Score: {selectedRequestModal.riskScore || 0})</p>
                </div>
                <RiskBadge level={selectedRequestModal.riskLevel} score={selectedRequestModal.riskScore} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setSelectedRequestModal(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Close
              </button>
              {selectedRequestModal.status !== 'Quoted' && (
                <button
                  onClick={() => {
                    const reqId = selectedRequestModal._id;
                    setSelectedRequestModal(null);
                    handleCreateQuotationFromRequest(reqId);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Create Quotation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW QUOTATION DETAIL MODAL */}
      {selectedQuotationView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Quotation Detail ({selectedQuotationView.quoteNumber})
                </h3>
                <p className="text-xs text-muted-foreground">Customer: {selectedQuotationView.customer?.company || selectedQuotationView.customer?.name}</p>
              </div>
              <button
                onClick={() => setSelectedQuotationView(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Unit Price</th>
                      <th className="p-2.5">Discount %</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedQuotationView.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-foreground">{item.product?.name || 'Product'}</td>
                        <td className="p-2.5 font-semibold">{item.quantity}</td>
                        <td className="p-2.5 font-medium">₹{item.unitPrice?.toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-emerald-500">{item.discountPercent}%</td>
                        <td className="p-2.5 text-right font-extrabold text-foreground">₹{item.lineTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-muted/50 p-4 rounded-xl space-y-1 text-right font-semibold">
                <p className="text-muted-foreground">Subtotal: <span className="text-foreground">₹{selectedQuotationView.subtotal?.toLocaleString()}</span></p>
                <p className="text-muted-foreground">GST / Tax (18%): <span className="text-foreground">₹{selectedQuotationView.tax?.toLocaleString()}</span></p>
                <p className="text-sm font-extrabold text-primary pt-1 border-t border-border">Grand Total: ₹{selectedQuotationView.grandTotal?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setSelectedQuotationView(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal & Negotiation Drawer */}
      <QuotationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        negotiationId={activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchDashboardData}
      />

    </div>
  );
};

export default SalesRepDashboard;
