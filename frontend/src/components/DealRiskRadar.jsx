import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const DealRiskRadar = ({ quotationId }) => {
  const [radar, setRadar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (quotationId) {
      fetchRadar();
    }
  }, [quotationId]);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/intelligence/risk-radar/${quotationId}`);
      setRadar(data);
    } catch (err) {
      console.error('Failed to fetch risk radar:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2 animate-pulse">Loading Risk Radar...</div>;
  }

  if (!radar) return null;

  const levelColor =
    radar.riskLevel === 'HIGH'
      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
      : radar.riskLevel === 'MEDIUM'
      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${radar.riskLevel === 'HIGH' ? 'text-rose-500' : (radar.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500')}`} />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Deal Risk Radar</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-muted-foreground">Score: {radar.riskScore}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${levelColor}`}>
            {radar.riskLevel} RISK
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <p className="font-semibold text-foreground/90">Main Risk Factors:</p>
        <ul className="space-y-1 pl-1">
          {radar.riskReasons?.slice(0, expanded ? undefined : 2).map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-muted-foreground text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DealRiskRadar;
