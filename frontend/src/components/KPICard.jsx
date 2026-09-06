import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const colorMap = {
  indigo: {
    text: 'text-indigo-400',
    bgIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 group-hover:border-indigo-500/60 group-hover:bg-indigo-500/20',
    glow: 'from-indigo-500/10 to-transparent',
    accent: '#6366f1',
  },
  emerald: {
    text: 'text-emerald-400',
    bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 group-hover:border-emerald-500/60 group-hover:bg-emerald-500/20',
    glow: 'from-emerald-500/10 to-transparent',
    accent: '#10b981',
  },
  amber: {
    text: 'text-amber-400',
    bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/30 group-hover:border-amber-500/60 group-hover:bg-amber-500/20',
    glow: 'from-amber-500/10 to-transparent',
    accent: '#f59e0b',
  },
  rose: {
    text: 'text-rose-400',
    bgIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/30 group-hover:border-rose-500/60 group-hover:bg-rose-500/20',
    glow: 'from-rose-500/10 to-transparent',
    accent: '#ef4444',
  },
  cyan: {
    text: 'text-cyan-400',
    bgIcon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 group-hover:border-cyan-500/60 group-hover:bg-cyan-500/20',
    glow: 'from-cyan-500/10 to-transparent',
    accent: '#06b6d4',
  },
  purple: {
    text: 'text-purple-400',
    bgIcon: 'bg-purple-500/10 text-purple-400 border-purple-500/30 group-hover:border-purple-500/60 group-hover:bg-purple-500/20',
    glow: 'from-purple-500/10 to-transparent',
    accent: '#a855f7',
  },
};

// Skeleton version
const KPICardSkeleton = () => (
  <div className="p-5 rounded-2xl glass-panel-interactive relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <div className="skeleton skeleton-text-sm w-24" />
        <div className="skeleton skeleton-title w-16 mt-2" />
        <div className="skeleton skeleton-text w-32 mt-1" />
      </div>
      <div className="skeleton skeleton-icon ml-3" />
    </div>
    <div className="mt-4 pt-3 border-t border-slate-800/60">
      <div className="skeleton skeleton-text-sm w-28" />
    </div>
  </div>
);

const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'indigo', loading = false, onClick }) => {
  if (loading) return <KPICardSkeleton />;

  const activeColor = colorMap[color] || colorMap.indigo;

  let trendDir = 'neutral';
  let trendLabel = trend;
  if (trend) {
    const cleaned = String(trend).replace('%', '').trim();
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      trendDir = num > 0 ? 'up' : num < 0 ? 'down' : 'neutral';
    } else if (String(trend).startsWith('+')) {
      trendDir = 'up';
    } else if (String(trend).startsWith('-')) {
      trendDir = 'down';
    }
  }

  const TrendIcon = trendDir === 'up' ? ArrowUpRight : trendDir === 'down' ? ArrowDownRight : Minus;
  const trendStyle =
    trendDir === 'up'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : trendDir === 'down'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <div
      className={`p-5 rounded-2xl glass-panel-interactive relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Ambient background glow on hover */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${activeColor.glow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      {/* Left accent line */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: activeColor.accent }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold text-white mt-2 font-mono-numeric tracking-tight group-hover:scale-[1.02] transition-transform origin-left">
            {value ?? '—'}
          </h3>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-300 shrink-0 ml-3 ${activeColor.bgIcon}`}
          >
            <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2 text-xs font-bold border-t border-slate-800/60 pt-3 relative z-10">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono text-[11px] border ${trendStyle}`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {trendLabel}
          </span>
          <span className="text-slate-500 font-medium text-[11px]">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
