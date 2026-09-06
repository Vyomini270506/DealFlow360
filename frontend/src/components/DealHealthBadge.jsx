import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

const DealHealthBadge = ({ quotationId }) => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quotationId) {
      fetchHealth();
    }
  }, [quotationId]);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/intelligence/health-score/${quotationId}`);
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch deal health:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !health) return null;

  const color =
    health.healthStatus === 'HEALTHY'
      ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
      : health.healthStatus === 'AT RISK'
      ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
      : 'text-rose-500 border-rose-500/30 bg-rose-500/10';

  return (
    <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <div>
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Deal Health</span>
          <span className="text-xs font-bold text-foreground">{health.healthStatus}</span>
        </div>
      </div>

      <div className="text-right">
        <div className={`px-3 py-1 rounded-xl text-xs font-black border font-mono inline-block ${color}`}>
          {health.healthScore} / 100
        </div>
      </div>
    </div>
  );
};

export default DealHealthBadge;
