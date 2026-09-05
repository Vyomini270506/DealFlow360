import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Award, CheckCircle2, DollarSign, Calendar, FileText, ShoppingBag, ShieldCheck, RefreshCw, User, Building2, Package, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ClosedDealsPage = () => {
  const [closedDeals, setClosedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchClosedDeals = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/quotations/closed-deals');
      setClosedDeals(data);
    } catch (err) {
      toast.error('Failed to load closed deals history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedDeals();
  }, []);

  const filteredDeals = closedDeals.filter(deal => {
    const custName = deal.customer?.name || deal.customer?.company || '';
    const qNum = deal.quoteNumber || '';
    const q = filterQuery.toLowerCase();
    return custName.toLowerCase().includes(q) || qNum.toLowerCase().includes(q);
  });

  const totalClosedVolume = closedDeals.reduce((sum, d) => sum + (d.grandTotal || 0), 0);

  return (
    <div className="space-y-6 p-6 bg-[#080B12] min-h-screen text-[#F5F7FA]">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242C3A] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Closed & Finalized Business Transactions</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA] tracking-tight flex items-center gap-2">
            <span>Closed Deals Workspace</span>
            <span className="text-xs bg-[#242C3A] text-[#A7B0C0] px-2.5 py-0.5 rounded-full font-mono font-bold">
              {closedDeals.length}
            </span>
          </h1>
          <p className="text-xs text-[#A7B0C0] mt-1">
            Archived record of all mutually confirmed deals, final contracts, generated product invoices, and active subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#111722] border border-[#242C3A] rounded-xl px-4 py-2 text-right">
            <p className="text-[10px] font-bold text-[#687386] uppercase tracking-wider">Total Revenue Closed</p>
            <p className="text-lg font-black text-[#22C55E] tracking-tight">
              ${totalClosedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={fetchClosedDeals}
            className="p-2.5 bg-[#161D29] hover:bg-[#242C3A] border border-[#242C3A] rounded-xl text-[#A7B0C0] hover:text-[#F5F7FA] transition"
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
          className="w-full max-w-md bg-[#111722] border border-[#242C3A] rounded-xl px-3.5 py-2 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
        />
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#687386] animate-pulse">
          Loading closed deals ledger...
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="bg-[#111722] border border-[#242C3A] rounded-2xl p-12 text-center space-y-3">
          <Award className="w-12 h-12 text-[#687386] mx-auto opacity-50" />
          <p className="text-sm font-bold text-[#A7B0C0]">No Closed Deals Found</p>
          <p className="text-xs text-[#687386] max-w-md mx-auto">
            Once a deal achieves dual confirmation from both Customer and Sales Representative and completes final confirmation, it will be safely archived here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDeals.map((deal) => (
            <div
              key={deal._id}
              className="bg-[#111722] border border-[#242C3A] hover:border-[#6366F1]/50 rounded-2xl p-5 shadow-lg space-y-4 transition"
            >
              {/* Deal Header */}
              <div className="flex items-start justify-between border-b border-[#242C3A] pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black font-mono text-[#818CF8] bg-[#6366F1]/10 px-2.5 py-0.5 rounded-lg border border-[#6366F1]/30">
                      {deal.quoteNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      CLOSED & FINALIZED
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F5F7FA] flex items-center gap-1.5 mt-1">
                    <Building2 className="w-4 h-4 text-[#818CF8]" />
                    <span>{deal.customer?.company || deal.customer?.name || 'Corporate Customer'}</span>
                  </h3>
                  <p className="text-xs text-[#687386] font-medium flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" />
                    Rep: {deal.salesRep?.name || 'Sales Representative'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-[#687386] font-semibold">Final Total Amount</p>
                  <p className="text-lg font-black text-[#22C55E]">
                    ${(deal.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-[#A7B0C0] font-mono mt-0.5">
                    Discount: {deal.totalDiscount ? `$${deal.totalDiscount}` : 'Standard'}
                  </p>
                </div>
              </div>

              {/* Product Line Items */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#687386] uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3 h-3 text-[#818CF8]" />
                  Final Contract Items ({deal.items?.length || 0})
                </p>
                <div className="bg-[#161D29] border border-[#242C3A] rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {deal.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold border-b border-[#242C3A] last:border-0 pb-1 last:pb-0">
                      <div>
                        <span className="text-[#F5F7FA] font-bold">{item.product?.name || 'Product'}</span>
                        <span className="text-[#687386] text-[11px] ml-2">x{item.quantity}</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-[#A7B0C0]">${item.unitPrice}</span>
                        {item.discountPercent > 0 && (
                          <span className="text-[#22C55E] ml-1 shrink-0">(-{item.discountPercent}%)</span>
                        )}
                        <span className="text-[#F5F7FA] font-bold ml-2">${item.lineTotal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Closure Timestamp Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#687386] pt-2 border-t border-[#242C3A]">
                <div className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Closed: {deal.acceptedAt ? new Date(deal.acceptedAt).toLocaleDateString() : new Date(deal.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#22C55E]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Invoice & Fulfillment Issued</span>
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
