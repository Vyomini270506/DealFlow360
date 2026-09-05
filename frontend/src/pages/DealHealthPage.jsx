import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Activity, ShieldAlert, AlertTriangle, TrendingUp, HelpCircle, ArrowRight } from 'lucide-react';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const DealHealthPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDealHealth();
  }, []);

  const fetchDealHealth = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/analytics/deal-health');
      setDeals(data);
    } catch (err) {
      toast.error('Failed to load deal health metrics');
    } finally {
      setLoading(false);
    }
  };

  const chartData = deals.map(d => ({
    name: d.quoteNumber,
    risk: d.riskScore,
    health: d.healthScore,
    value: d.grandTotal
  }));

  const atRiskDeals = deals.filter(d => d.riskScore >= 60 || d.alerts?.length > 0);

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-400" />
          Deal Health & Anomaly Analytics
        </h1>
        <p className="text-xs text-slate-400">Automated monitoring for discount anomalies, delivery slippage, and stalled approval bottlenecks</p>
      </div>

      {/* Visual Recharts Overview */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pipeline Risk vs Health Distribution</h2>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Bar dataKey="risk" name="Risk Score">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.risk >= 60 ? '#f43f5e' : entry.risk >= 30 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actionable Deal Health Alert Cards (WHAT happened, WHY it matters, WHAT action to take) */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" /> Actionable Deal Alerts & Diagnostic Insights
        </h2>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Analyzing deal health indicators...</p>
        ) : atRiskDeals.length === 0 ? (
          <p className="text-xs text-emerald-400 py-4 text-center">All deals in pipeline are healthy with clean execution.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atRiskDeals.map((deal) => (
              <div key={deal._id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">{deal.quoteNumber}</h3>
                    <StatusBadge status={deal.status} />
                  </div>
                  <RiskBadge level={deal.riskLevel} score={deal.riskScore} />
                </div>

                <p className="text-xs font-semibold text-slate-300">Account: <span className="text-white">{deal.customer?.company}</span> (₹{deal.grandTotal?.toLocaleString()})</p>

                {deal.alerts?.map((alert, idx) => (
                  <div key={idx} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                    
                    {/* WHAT happened */}
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px] bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 shrink-0">
                        WHAT Happened
                      </span>
                      <p className="font-semibold text-slate-200">{alert.message}</p>
                    </div>

                    {/* WHY it matters */}
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60">
                      <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 shrink-0">
                        WHY It Matters
                      </span>
                      <p className="text-slate-400">{alert.whyItMatters}</p>
                    </div>

                    {/* WHAT action to take */}
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
                        Action Needed
                      </span>
                      <p className="text-emerald-300 font-semibold">{alert.recommendedAction}</p>
                    </div>

                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DealHealthPage;
