import React from 'react';

// Human-readable label mapping
const labelMap = {
  'Draft': 'Draft',
  'Submitted': 'Submitted',
  'Pending': 'Pending',
  'Processing': 'Processing',
  'Quoted': 'Quoted',
  'Pending Approval': 'Pending Approval',
  'Approved': 'Approved',
  'Approved_Manager': 'Approved',
  'Rejected': 'Rejected',
  'Rejected_Manager': 'Rejected',
  'Negotiation': 'Negotiation',
  'Negotiation_Required': 'Negotiation Required',
  'Active': 'Active',
  'Confirmed': 'Confirmed',
  'Closed': 'Closed',
  'CLOSED': 'Closed',
  'WAITING_FOR_FINANCE': 'Awaiting Finance',
  'FINANCE_REVIEWED': 'Finance Reviewed',
  'Fulfillment': 'Fulfillment',
  'Completed': 'Completed',
  'Awaiting Allocation': 'Awaiting Allocation',
  'Partially Fulfilled': 'Partial',
  'Fully Fulfilled': 'Fulfilled',
  'DISCARDED': 'Discarded',
};

const styles = {
  'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  'Submitted': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Pending': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Processing': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Quoted': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Pending Approval': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Approved_Manager': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Rejected': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'Rejected_Manager': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'Negotiation': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Negotiation_Required': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Active': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Confirmed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Closed': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'CLOSED': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'WAITING_FOR_FINANCE': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'FINANCE_REVIEWED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Fulfillment': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Awaiting Allocation': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Partially Fulfilled': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Fully Fulfilled': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'DISCARDED': 'bg-slate-500/10 text-slate-500 border-slate-600/30',
};

export const StatusBadge = ({ status }) => {
  const currentStyle = styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  const label = labelMap[status] || status?.replace(/_/g, ' ') || '—';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-sm shadow-sm ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

export const RiskBadge = ({ level, score }) => {
  const numericScore = Number(score) || 0;
  const derivedLevel = level || (numericScore >= 60 ? 'HIGH' : numericScore >= 30 ? 'MEDIUM' : 'LOW');

  let style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let barClass = 'risk-bar-low';

  if (derivedLevel === 'HIGH') {
    style = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    barClass = 'risk-bar-high';
  } else if (derivedLevel === 'MEDIUM') {
    style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    barClass = 'risk-bar-medium';
  }

  const clampedPct = Math.min(100, Math.max(0, numericScore));

  return (
    <div className="inline-flex flex-col gap-1 min-w-[80px]">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border backdrop-blur-sm shadow-sm font-mono-numeric ${style}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-75" />
        {derivedLevel} <span className="opacity-60 text-[10px]">({numericScore})</span>
      </span>
      <div className="risk-bar-track">
        <div className={`progress-bar-fill ${barClass}`} style={{ width: `${clampedPct}%` }} />
      </div>
    </div>
  );
};

// ─── Skeleton Components ─────────────────────────────────────────────────────

export const SkeletonRow = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="p-3">
        <div className={`skeleton skeleton-text ${i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-full max-w-[120px]'}`} />
      </td>
    ))}
  </tr>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-5 rounded-2xl glass-panel-interactive ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <div className="skeleton skeleton-text-sm w-24" />
        <div className="skeleton skeleton-title w-20 mt-2" />
        <div className="skeleton skeleton-text w-32 mt-1" />
      </div>
      <div className="skeleton skeleton-icon ml-3" />
    </div>
    <div className="mt-4 pt-3 border-t border-slate-800/60">
      <div className="skeleton skeleton-text-sm w-28" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 4, cols = 5 }) => (
  <div className="overflow-x-auto">
    <table className="df-table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="p-3">
              <div className="skeleton skeleton-text-sm" style={{ width: `${50 + i * 10}px` }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state animate-fade-in">
    <div className="empty-state-icon">
      {Icon && <Icon className="w-6 h-6 text-slate-500" />}
    </div>
    <div>
      <p className="text-sm font-bold text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">{description}</p>}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        className="btn-primary mt-1"
      >
        {action.label}
      </button>
    )}
  </div>
);
