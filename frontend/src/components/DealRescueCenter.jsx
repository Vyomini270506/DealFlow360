import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { AlertOctagon, ArrowRight, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

const DealRescueCenter = ({ onSelectDeal }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRescueDeals();
  }, []);

  const fetchRescueDeals = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/intelligence/deals-needing-attention');
      setDeals(data || []);
    } catch (err) {
      console.error('Failed to fetch deals needing attention:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center animate-pulse">Loading Deal Rescue Center...</div>;
  }

  if (deals.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-rose-500 shadow-md">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/30">
            <AlertOctagon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              🚨 Deal Rescue Center — Deals Needing Attention
            </h3>
            <p className="text-[11px] text-muted-foreground">Automated detection of delayed approvals, margin breaches, or inactive customer threads</p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
          {deals.length} Action Needed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {deals.map((item) => (
          <div key={item.id} className="p-3.5 rounded-xl bg-card border border-rose-500/30 space-y-2 shadow-xs hover:border-rose-500 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-foreground">{item.title}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                {item.severity}
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{item.issue}</span>
            </p>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => onSelectDeal && onSelectDeal(item.recordId, item.recordType, item.actionLabel, item.id, item.approvalId)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold text-xs inline-flex items-center gap-1 transition shadow-xs"
              >
                <span>[{item.actionLabel}]</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealRescueCenter;
