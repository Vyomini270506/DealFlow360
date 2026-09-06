import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Clock, User, CheckCircle2, XCircle, AlertCircle, FileText, ShoppingBag, FileCheck2, Repeat } from 'lucide-react';

const ActivityTimeline = ({ recordType, recordId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (recordType && recordId) {
      fetchTimeline();
    }
  }, [recordType, recordId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/audit-logs/${recordType}/${recordId}`);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-500 py-3 text-center animate-pulse">Loading activity history...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-3 text-center italic">
        No logged activities recorded yet.
      </div>
    );
  }

  const getActionColor = (action) => {
    if (action.includes('APPROVED') || action.includes('CLOSED')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (action.includes('REJECTED') || action.includes('WITHDREW')) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (action.includes('FINANCE') || action.includes('MANAGER')) return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
    return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
  };

  return (
    <div className="space-y-3 py-2">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Real MongoDB Activity & Audit History</span>
      </h4>

      <div className="relative pl-4 border-l-2 border-slate-800 space-y-4 text-xs">
        {logs.map((log) => (
          <div key={log._id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-indigo-400 group-hover:scale-125 transition" />

            <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getActionColor(log.action)}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              {log.comment && (
                <p className="text-slate-200 font-medium text-[11px] mt-1">{log.comment}</p>
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 mt-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>By: <strong>{log.performedBy?.name || 'System Auto-Processor'}</strong> ({log.performerRole || 'SYSTEM'})</span>
                {log.previousStatus && log.newStatus && (
                  <span className="ml-auto font-mono text-slate-500">
                    {log.previousStatus} → <strong className="text-slate-300">{log.newStatus}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
