import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { FileText, MessageSquare, FileCheck2, Repeat, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const CustomerPortal = () => {
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [qRes, invRes, subRes] = await Promise.all([
        API.get('/quotations'),
        API.get('/invoices'),
        API.get('/subscriptions')
      ]);
      setQuotations(qRes.data);
      setInvoices(invRes.data);
      setSubscriptions(subRes.data);
    } catch (err) {
      toast.error('Failed to load customer portal data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmQuotation = async (quoteId) => {
    try {
      await API.post(`/quotations/${quoteId}/submit`); // Flips status to Confirmed/Approved
      toast.success('Quotation confirmed successfully!');
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Confirmation failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-emerald-950/40 p-6 rounded-2xl border border-indigo-500/20 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/50">
            Gold Account
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-2">Welcome to Customer Portal</h1>
          <p className="text-xs text-slate-300">View quotations, ask questions, negotiate terms, and track invoices</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Active Quotations" value={quotations.length} subtitle="Pending & Confirmed" icon={FileText} color="indigo" />
        <KPICard title="Pending Negotiations" value={quotations.filter(q => q.status === 'Negotiation').length} subtitle="Open Q&A threads" icon={MessageSquare} color="cyan" />
        <KPICard title="Invoices" value={invoices.length} subtitle="Billing records" icon={FileCheck2} color="amber" />
        <KPICard title="Active Subscriptions" value={subscriptions.length} subtitle="Recurring services" icon={Repeat} color="emerald" />
      </div>

      {/* Quotations List Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">My Quotations & Counter Offers</h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading quotations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quote Number</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{q.quoteNumber}</td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{q.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setActiveNegotiationId(q._id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Q&A / Counter Discount
                      </button>

                      {q.status === 'Approved' && (
                        <button
                          onClick={() => handleConfirmQuotation(q._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Confirm Deal
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Negotiation Drawer */}
      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchCustomerData}
      />

    </div>
  );
};

export default CustomerPortal;
