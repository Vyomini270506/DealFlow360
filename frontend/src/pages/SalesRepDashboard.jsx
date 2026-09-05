import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import QuotationModal from '../components/QuotationModal';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { Plus, FileText, CheckSquare, AlertTriangle, Truck, MessageSquare, IndianRupee, Eye } from 'lucide-react';
import { toast } from 'sonner';

const SalesRepDashboard = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);

  useEffect(() => {
    fetchMyQuotations();
  }, []);

  const fetchMyQuotations = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/quotations');
      setQuotations(data);
    } catch (err) {
      toast.error('Failed to load sales rep quotations');
    } finally {
      setLoading(false);
    }
  };

  const openQuotes = quotations.filter(q => q.status === 'Draft' || q.status === 'Negotiation');
  const pendingApprovals = quotations.filter(q => q.status === 'Pending Approval');
  const approvedDeals = quotations.filter(q => q.status === 'Approved' || q.status === 'Confirmed' || q.status === 'Fulfillment' || q.status === 'Completed');
  const atRiskDeals = quotations.filter(q => q.riskLevel === 'HIGH' || q.riskScore >= 60);
  const negotiationRequests = quotations.filter(q => q.status === 'Negotiation');
  const pipelineValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const handleSubmitForApproval = async (quoteId) => {
    try {
      await API.post(`/quotations/${quoteId}/submit`);
      toast.success('Quotation submitted for approval workflow');
      fetchMyQuotations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Rep Dashboard</h1>
          <p className="text-xs text-slate-400">Manage your deals, draft quotations, track approvals, and respond to negotiations</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> + Create New Quotation
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Pipeline Value" value={`₹${(pipelineValue / 100000).toFixed(1)}L`} subtitle="All active deals" icon={IndianRupee} color="indigo" />
        <KPICard title="My Open Quotations" value={openQuotes.length} subtitle="Drafts & Negotiations" icon={FileText} color="cyan" />
        <KPICard title="Pending Approvals" value={pendingApprovals.length} subtitle="Awaiting manager signoff" icon={CheckSquare} color="amber" />
        <KPICard title="At-Risk Deals" value={atRiskDeals.length} subtitle="Score 60+" icon={AlertTriangle} color="rose" />
      </div>

      {/* Main Quotations Table */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">My Quotations & Pipeline</h2>
          <span className="text-xs text-slate-400 font-semibold">{quotations.length} Deals Total</span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading quotations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quote ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total Value</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{q.quoteNumber}</td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-200">{q.customer?.company}</p>
                      <p className="text-[10px] text-slate-400">{q.customer?.name} ({q.customer?.tier})</p>
                    </td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{q.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={q.riskLevel} score={q.riskScore} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {q.status === 'Draft' && (
                        <button
                          onClick={() => handleSubmitForApproval(q._id)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition"
                        >
                          Submit
                        </button>
                      )}
                      
                      <button
                        onClick={() => setActiveNegotiationId(q._id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-400" /> Chat
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
        onSuccess={fetchMyQuotations}
      />

      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchMyQuotations}
      />

    </div>
  );
};

export default SalesRepDashboard;
