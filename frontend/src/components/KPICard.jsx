import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      text: 'text-[#818CF8]',
      bgIcon: 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30',
    },
    emerald: {
      text: 'text-[#22C55E]',
      bgIcon: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    },
    amber: {
      text: 'text-[#F59E0B]',
      bgIcon: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    },
    rose: {
      text: 'text-[#EF4444]',
      bgIcon: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    },
    cyan: {
      text: 'text-[#22D3EE]',
      bgIcon: 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/30',
    }
  };

  const activeColor = colorMap[color] || colorMap.indigo;
  const isPositive = trend && !trend.startsWith('-');

  return (
    <div className="p-5 rounded-2xl bg-[#111722] border border-[#242C3A] relative overflow-hidden group transition-all duration-200 hover:border-[#6366F1] hover:-translate-y-0.5">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold text-[#687386] uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-[#F5F7FA] mt-1.5 font-mono-numeric tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs font-medium text-[#A7B0C0] mt-1">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl border ${activeColor.bgIcon} transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold border-t border-[#242C3A] pt-2.5 relative z-10">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono ${isPositive ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30' : 'text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
          <span className="text-[#687386] font-medium">vs benchmark</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
