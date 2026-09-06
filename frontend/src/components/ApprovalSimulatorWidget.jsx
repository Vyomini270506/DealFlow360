import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Eye, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const ApprovalSimulatorWidget = ({ items, customerId }) => {
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    if (items && items.length > 0) {
      runSimulation();
    }
  }, [items, customerId]);

  const runSimulation = async () => {
    try {
      const { data } = await API.post('/intelligence/approval-simulator', { items, customerId });
      setSimulation(data);
    } catch (err) {
      console.error('Failed approval simulation:', err);
    }
  };

  if (!simulation) return null;

  const riskColor =
    simulation.riskLevel === 'HIGH'
      ? 'text-rose-500 bg-rose-500/10 border-rose-500/30'
      : simulation.riskLevel === 'MEDIUM'
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-primary" />
          Approval Preview & Risk Simulation
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${riskColor}`}>
          {simulation.riskLevel} RISK
        </span>
      </div>

      <div className="text-xs space-y-1 text-muted-foreground pt-1 border-t border-border">
        <p className="flex justify-between">
          <span>Highest Discount:</span>
          <span className="font-bold text-foreground">{simulation.discountPercent}%</span>
        </p>
        <p className="flex justify-between">
          <span>Required Approval:</span>
          <span className="font-bold text-foreground">
            {simulation.approvalChain?.join(' → ') || 'None (Direct Rep Signoff)'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default ApprovalSimulatorWidget;
