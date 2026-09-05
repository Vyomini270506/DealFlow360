import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import QuotationModal from '../components/QuotationModal';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { Search, Filter, Plus, FileText, Eye, MessageSquare, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const QuotationsPage = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter, riskFilter]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (riskFilter) params.riskLevel = riskFilter;
      if (search) params.search = search;

      const { data } = await API.get('/quotations', { params });
      setQuotations(data);
    } catch (err) {
      toast.error('Failed to load quotations list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Quotations Directory</h1>
          <p className="text-xs text-slate-400">Search, filter, track risk scores, and manage all active deal quotations</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> + Create New Quotation
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQuotations()}
            placeholder="Search by quote number or customer company..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Fulfillment">Fulfillment</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-indigo-500"
          >
            <option value="">All Risk Levels</option>
            <option value="LOW">Low Risk (0-29)</option>
            <option value="MEDIUM">Medium Risk (30-59)</option>
            <option value="HIGH">High Risk (60-100)</option>
          </select>
        </div>

      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading quotations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quote ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{q.quoteNumber}</td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-200">{q.customer?.company}</p>
                      <p className="text-[10px] text-slate-400">{q.customer?.name}</p>
                    </td>
                    <td className="p-3 font-medium text-slate-300">{q.salesRep?.name}</td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{q.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={q.riskLevel} score={q.riskScore} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/quotations/${q._id}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3 text-indigo-400" /> View Detail
                      </button>
                      <button
                        onClick={() => setActiveNegotiationId(q._id)}
                        className="px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-700/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-400" /> Q&A
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuotationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchQuotations}
      />

      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchQuotations}
      />

    </div>
  );
};

export default QuotationsPage;
