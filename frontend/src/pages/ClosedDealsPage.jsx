import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { 
  Award, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  DollarSign, 
  ExternalLink,
  Package,
  RefreshCw,
  User,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

const ClosedDealsPage = () => {
  const [closedDeals, setClosedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    fetchClosedDeals();
  }, []);

  const fetchClosedDeals = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/quotations?status=Closed');
      setClosedDeals(data || []);
    } catch (err) {
      toast.error('Failed to load closed deals ledger');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = closedDeals.filter(d => {
    if (!filterQuery) return true;
    const custName = d.customer?.company || d.customer?.name || '';
    const qNum = d.quoteNumber || '';
    const q = filterQuery.toLowerCase();
    return custName.toLowerCase().includes(q) || qNum.toLowerCase().includes(q);
  });

  const totalClosedVolume = closedDeals.reduce((sum, d) => sum + (d.grandTotal || 0), 0);

  return (
    <div className="space-y-6 p-6 min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2 backdrop-blur-md shadow-sm">
            <Award className="w-3.5 h-3.5" />
            <span>Closed & Finalized Business Transactions</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Closed Deals Workspace</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {closedDeals.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Archived record of all mutually confirmed deals, final contracts, generated product invoices, and active subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel rounded-xl px-4 py-2.5 text-right border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Closed</p>
            <p className="text-lg font-black text-emerald-400 tracking-tight font-mono-numeric">
              ₹{totalClosedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={fetchClosedDeals}
            className="p-2.5 glass-panel hover:bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
            title="Refresh Closed Deals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter closed deals by customer name or quote number..."
          className="w-full max-w-md glass-panel border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
        />
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
          Loading closed deals ledger...
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="glass-panel border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Award className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
          <p className="text-sm font-bold text-slate-300">No Closed Deals Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once a deal achieves dual confirmation from both Customer and Sales Representative and completes final confirmation, it will be safely archived here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDeals.map((deal) => (
            <div
              key={deal._id}
              className="glass-panel-interactive rounded-2xl p-5 shadow-xl space-y-4"
            >
              {/* Deal Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                      {deal.quoteNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" />
                      CLOSED & FINALIZED
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 mt-1">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{deal.customer?.company || deal.customer?.name || 'Corporate Customer'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{deal.customer?.email || 'N/A'}</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Final Value</p>
                  <p className="text-lg font-black text-emerald-400 font-mono-numeric mt-0.5">
                    ₹{deal.grandTotal?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contracted Products</p>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                  {deal.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-indigo-400" />
                        <span><strong>{item.quantity}x</strong> {item.product?.name || 'Product'}</span>
                      </span>
                      <span className="font-mono text-slate-400">₹{item.lineTotal?.toLocaleString()} ({item.discountPercent}% disc)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rep & Closure Footer */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sales Rep: <strong className="text-slate-200">{deal.salesRep?.name || 'Assigned Rep'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(deal.updatedAt || deal.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClosedDealsPage;
