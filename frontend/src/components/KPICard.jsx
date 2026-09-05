import React from 'react';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/20',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20',
    cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/20',
  };

  const accentStyle = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentStyle} blur-2xl opacity-30 group-hover:opacity-50 transition-opacity`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-white mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 ${accentStyle.split(' ')[2]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span className={trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{trend}</span>
          <span className="text-slate-500 font-normal">vs last month</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
