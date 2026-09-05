import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import QuotationModal from '../components/QuotationModal';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { Plus, FileText, CheckSquare, AlertTriangle, Truck, MessageSquare, IndianRupee, Eye, ShoppingCart, Send, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const SalesRepDashboard = () => {
  const [quotations, setQuotations] = useState([]);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [qRes, reqRes] = await Promise.all([
        API.get('/quotations'),
        API.get('/customer-requests').catch(() => ({ data: [] }))
      ]);

      setQuotations(qRes.data || []);
      setCustomerRequests(reqRes.data || []);
    } catch (err) {
      toast.error('Failed to load sales rep dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotationFromRequest = async (requestId) => {
    try {
      await API.post(`/customer-requests/${requestId}/create-quotation`, {});
      toast.success('Official Quotation created and sent to Customer successfully!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleEscalateToManager = async (requestId) => {
    try {
      await API.post(`/customer-requests/${requestId}/escalate`, {
        escalationReason: 'Discount/Risk score exceeds rep authority. Escalated to Sales Manager for signoff.'
      });
      toast.success('Request escalated to Sales Manager for approval!');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Escalation failed');
    }
  };

  const openQuotes = quotations.filter(q => q.status === 'Draft' || q.status === 'Negotiation');
  const pendingApprovals = quotations.filter(q => q.status === 'Pending Approval');
  const atRiskDeals = quotations.filter(q => q.riskLevel === 'HIGH' || q.riskScore >= 60);
  const pipelineValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  return (
    <div className="p-6 space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Sales Representative Dashboard</h1>
          <p className="text-xs text-muted-foreground">Review incoming customer product requests, evaluate risk, issue official quotations, and respond to negotiations</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> + Create Direct Quotation
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Assigned Product Requests" value={customerRequests.length} subtitle="Automatically assigned via workload" icon={ShoppingCart} color="indigo" />
        <KPICard title="My Active Pipeline" value={`₹${(pipelineValue / 100000).toFixed(1)}L`} subtitle="All active deals" icon={IndianRupee} color="cyan" />
        <KPICard title="Pending Approvals" value={pendingApprovals.length} subtitle="Awaiting manager signoff" icon={CheckSquare} color="amber" />
        <KPICard title="At-Risk Deals" value={atRiskDeals.length} subtitle="Score 60+" icon={AlertTriangle} color="rose" />
      </div>

      {/* MY ASSIGNED CUSTOMER PRODUCT REQUESTS TABLE */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              My Assigned Customer Product Requests
            </h2>
            <p className="text-xs text-muted-foreground">Assigned to you automatically by backend least-workload engine. Review risk and issue official quotations.</p>
          </div>
          <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
            {customerRequests.length} Requests
          </span>
        </div>

        {customerRequests.length === 0 ? (
          <div className="p-6 text-center bg-card rounded-xl border border-border">
            <p className="text-xs font-bold text-muted-foreground">No customer product requests currently pending review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Request Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Products & Quantities</th>
                  <th className="p-3">Desired Discount</th>
                  <th className="p-3">Risk Assessment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Rep Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {customerRequests.map((reqItem) => {
                  const isLowRisk = reqItem.riskLevel === 'LOW';
                  const isEscalated = reqItem.status === 'Escalated_Manager';
                  const isQuoted = reqItem.status === 'Quoted';

                  return (
                    <tr key={reqItem._id} className="hover:bg-muted/50 transition">
                      <td className="p-3 font-bold text-primary">{reqItem.requestNumber}</td>
                      <td className="p-3">
                        <p className="font-bold text-foreground">{reqItem.customer?.company || reqItem.customer?.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{reqItem.customer?.tier} Tier</p>
                      </td>
                      <td className="p-3">
                        {reqItem.items?.map((i, idx) => (
                          <div key={idx} className="text-[11px]">
                            <span className="font-bold">{i.quantity}x</span> {i.product?.name || 'Product'}
                          </div>
                        ))}
                      </td>
                      <td className="p-3 font-extrabold text-foreground">
                        {reqItem.items?.map(i => `${i.desiredDiscountPercent}%`).join(', ')}
                      </td>
                      <td className="p-3">
                        <RiskBadge level={reqItem.riskLevel} score={reqItem.riskScore} />
                        {reqItem.riskReasons && reqItem.riskReasons.length > 0 && (
                          <p className="text-[10px] text-rose-500 font-medium mt-0.5">{reqItem.riskReasons[0]}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isQuoted ? 'bg-success/10 text-success border border-success/30' : 
                          isEscalated ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 
                          'bg-primary/10 text-primary border border-primary/30'
                        }`}>
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {isQuoted ? (
                          <span className="text-[11px] font-bold text-success flex items-center justify-end gap-1">
                            ✓ Quotation Sent
                          </span>
                        ) : isLowRisk || reqItem.status === 'Approved_Manager' ? (
                          <button
                            onClick={() => handleCreateQuotationFromRequest(reqItem._id)}
                            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                          >
                            <Send className="w-3.5 h-3.5" /> Create Quotation
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEscalateToManager(reqItem._id)}
                            disabled={isEscalated}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition ${
                              isEscalated 
                                ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                            }`}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>{isEscalated ? 'Awaiting Manager' : 'Send to Sales Manager'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Quotations Table */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">My Quotations & Pipeline</h2>
          <span className="text-xs text-muted-foreground font-semibold">{quotations.length} Deals Total</span>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading quotations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Quote ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total Value</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-bold text-foreground">{q.quoteNumber}</td>
                    <td className="p-3">
                      <p className="font-bold text-foreground">{q.customer?.company}</p>
                      <p className="text-[10px] text-muted-foreground">{q.customer?.name} ({q.customer?.tier})</p>
                    </td>
                    <td className="p-3 font-extrabold text-primary">₹{q.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={q.riskLevel} score={q.riskScore} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setActiveNegotiationId(q._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-card font-semibold text-[11px] inline-flex items-center gap-1 transition shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Q&A Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal & Negotiation Drawer */}
      <QuotationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchDashboardData}
      />

    </div>
  );
};

export default SalesRepDashboard;
