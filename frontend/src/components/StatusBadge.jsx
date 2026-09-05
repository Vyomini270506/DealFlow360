import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    'Draft': 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30',
    'Submitted': 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    'Processing': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    'Quoted': 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    'Pending Approval': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    'Approved': 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    'Rejected': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    'Negotiation': 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    'Negotiation_Required': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    'Active': 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    'Confirmed': 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    'Closed': 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30',
    'CLOSED': 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30',
    'Fulfillment': 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    'Completed': 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
  };

  const currentStyle = styles[status] || 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export const RiskBadge = ({ level, score }) => {
  let style = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30';
  if (level === 'HIGH' || score >= 60) {
    style = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30';
  } else if (level === 'MEDIUM' || score >= 30) {
    style = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono-numeric ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {level || (score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW')} ({score ?? 0})
    </span>
  );
};
