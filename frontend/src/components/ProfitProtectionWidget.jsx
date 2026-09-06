import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { DollarSign, ShieldAlert, AlertTriangle, TrendingDown } from 'lucide-react';

const ProfitProtectionWidget = ({ items, customerId }) => {
  const [profit, setProfit] = useState(null);

  useEffect(() => {
    if (items && items.length > 0) {
      calculateProfit();
    }
  }, [items, customerId]);

  const calculateProfit = async () => {
    try {
      const { data } = await API.post('/intelligence/profit-protection', { items, customerId });
      setProfit(data);
    } catch (err) {
      console.error('Failed profit protection calculation:', err);
    }
  };

  if (!profit) return null;

  return (
    <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Profit Protection Impact
        </span>
        <span className="text-xs font-bold font-mono text-emerald-500">
          Estimated Margin: ₹{profit.proposedMargin?.toLocaleString()}
        </span>
      </div>

      {profit.marginLost > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border">
          <div>
            <span className="text-muted-foreground text-[10px]">Margin Impact:</span>
            <p className="font-extrabold text-rose-500">-₹{profit.marginLost?.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Reduction:</span>
            <p className="font-extrabold text-rose-500">{profit.marginReductionPercent}%</p>
          </div>
        </div>
      )}

      {profit.warning && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] font-bold flex items-center gap-1.5 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{profit.warning}</span>
        </div>
      )}
    </div>
  );
};

export default ProfitProtectionWidget;
