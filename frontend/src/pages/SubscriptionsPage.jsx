import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { 
  Repeat, 
  Calendar, 
  ShieldCheck, 
  PauseCircle, 
  PlayCircle, 
  XCircle, 
  RefreshCw, 
  FileCheck2, 
  DollarSign, 
  Layers,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/subscriptions');
      setSubscriptions(data || []);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (subId, newStatus) => {
    try {
      await API.put(`/subscriptions/${subId}/status`, { status: newStatus });
      toast.success(`Subscription status updated to '${newStatus}'`);
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to update subscription status');
    }
  };

  const handleGenerateInvoice = async (subId) => {
    setGeneratingId(subId);
    try {
      const { data } = await API.post(`/subscriptions/${subId}/generate-invoice`);
      toast.success(`Generated recurring invoice: ${data.invoice?.invoiceNumber}`);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate recurring invoice');
    } finally {
      setGeneratingId(null);
    }
  };

  const activeCount = subscriptions.filter(s => s.status?.toUpperCase() === 'ACTIVE').length;
  const pausedCount = subscriptions.filter(s => s.status?.toUpperCase() === 'PAUSED').length;
  const cancelledCount = subscriptions.filter(s => s.status?.toUpperCase() === 'CANCELLED').length;
  const totalARR = subscriptions
    .filter(s => s.status?.toUpperCase() === 'ACTIVE')
    .reduce((sum, s) => {
      const amt = s.amount || 0;
      const cycle = (s.billingCycle || s.billingFrequency || '').toUpperCase();
      if (cycle.includes('MONTH')) return sum + amt * 12;
      if (cycle.includes('QUARTER')) return sum + amt * 4;
      return sum + amt;
    }, 0);

  return (
    <div className="p-6 space-y-6 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-2 backdrop-blur-md shadow-sm">
            <Repeat className="w-3.5 h-3.5" />
            <span>SaaS & Recurring Service Agreements</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Subscription Engine</span>
            <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {subscriptions.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage recurring enterprise SaaS software licenses, cloud maintenance SLAs, and automated billing cycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel rounded-xl px-4 py-2 text-right border border-purple-500/30 shadow-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Contract ARR</p>
            <p className="text-lg font-black text-purple-400 tracking-tight font-mono-numeric">
              ₹{totalARR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            className="p-2.5 glass-panel hover:bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
            title="Refresh Subscriptions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Subscriptions</p>
            <p className="text-xl font-black text-white mt-1">{subscriptions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active SLAs</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Paused Contracts</p>
            <p className="text-xl font-black text-amber-400 mt-1">{pausedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <PauseCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Cancelled</p>
            <p className="text-xl font-black text-rose-400 mt-1">{cancelledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Subscriptions Table */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" /> Active & Historical Subscription Contracts
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-12 text-center animate-pulse">Loading real subscription records from MongoDB...</p>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Repeat className="w-10 h-10 mx-auto opacity-40 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No Subscriptions Found</p>
            <p className="text-xs text-slate-500">Close a quotation containing recurring SaaS or Services products to create subscriptions automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Sub ID</th>
                  <th className="p-3">Customer Company</th>
                  <th className="p-3">Plan / Agreement Name</th>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3">Contract Value</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Next Renewal</th>
                  <th className="p-3 text-right">Actions & Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {subscriptions.map((sub) => {
                  const statusUpper = (sub.status || '').toUpperCase();
                  const isActive = statusUpper === 'ACTIVE';
                  const isPaused = statusUpper === 'PAUSED';

                  return (
                    <tr key={sub._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-purple-400 font-bold">{sub.subscriptionNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-200">{sub.customer?.company || sub.customer?.name || 'Customer'}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-white">{sub.planName}</td>
                      <td className="p-3 text-slate-300">{sub.billingCycle || sub.billingFrequency}</td>
                      <td className="p-3 font-extrabold text-emerald-400 font-mono">₹{sub.amount?.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isPaused
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {isActive && (
                          <button
                            onClick={() => handleGenerateInvoice(sub._id)}
                            disabled={generatingId === sub._id}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                            title="Generate next recurring billing invoice"
                          >
                            <FileCheck2 className={`w-3 h-3 ${generatingId === sub._id ? 'animate-spin' : ''}`} />
                            <span>Bill Next Cycle</span>
                          </button>
                        )}

                        {isActive ? (
                          <button
                            onClick={() => handleStatusChange(sub._id, 'Paused')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-[11px] hover:bg-amber-500/20 transition"
                          >
                            Pause
                          </button>
                        ) : isPaused ? (
                          <button
                            onClick={() => handleStatusChange(sub._id, 'Active')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] hover:bg-emerald-500/20 transition"
                          >
                            Resume
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default SubscriptionsPage;
