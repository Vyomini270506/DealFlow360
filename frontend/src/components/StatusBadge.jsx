import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    'Draft': 'bg-slate-800 text-slate-300 border-slate-700',
    'Pending Approval': 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse',
    'Approved': 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    'Rejected': 'bg-rose-950/60 text-rose-400 border-rose-800/60',
    'Negotiation': 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
    'Confirmed': 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60',
    'Fulfillment': 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    'Completed': 'bg-purple-950/60 text-purple-400 border-purple-800/60',
  };

  const currentStyle = styles[status] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStyle}`}>
      {status}
    </span>
  );
};

export const RiskBadge = ({ level, score }) => {
  let style = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
  if (level === 'HIGH' || score >= 60) {
    style = 'bg-rose-950/60 text-rose-400 border-rose-800/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
  } else if (level === 'MEDIUM' || score >= 30) {
    style = 'bg-amber-950/60 text-amber-400 border-amber-800/60';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {level || (score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW')} ({score ?? 0})
    </span>
  );
};
