import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import { Users, CheckSquare, AlertTriangle, TrendingUp, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const SalesManagerDashboard = () => {
  const [approvals, setApprovals] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedRepFilter, setSelectedRepFilter] = useState('ALL');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, qRes] = await Promise.all([
        API.get('/approvals'),
        API.get('/quotations')
      ]);
      setApprovals(appRes.data);
      setQuotations(qRes.data);
    } catch (err) {
      toast.error('Failed to load manager dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  // Mock Sales Team Performance Data required by prompt
  const salesTeam = [
    { name: 'Rahul Sharma', pipeline: 1240000, deals: 4, repId: 'rahul' },
    { name: 'Priya Patel', pipeline: 980000, deals: 3, repId: 'priya' },
    { name: 'Aman Gupta', pipeline: 720000, deals: 2, repId: 'aman' },
    { name: 'Neha Verma', pipeline: 650000, deals: 2, repId: 'neha' }
  ];

  const totalTeamSales = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const pendingCount = approvals.filter(a => a.managerApproval?.status === 'PENDING').length;
  const highDiscountDeals = quotations.filter(q => q.riskReasons?.some(r => r.includes('Discount')));
  const atRiskDeals = quotations.filter(q => q.riskLevel === 'HIGH' || q.riskScore >= 60);

  const filteredQuotations = selectedRepFilter === 'ALL'
    ? quotations
    : quotations.filter(q => q.salesRep?.name?.toLowerCase().includes(selectedRepFilter.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Manager Dashboard</h1>
        <p className="text-xs text-slate-400">Oversee team pipeline performance, manage normal quotation approvals, and eliminate bottlenecks</p>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Team Sales" value={`₹${(totalTeamSales / 100000).toFixed(1)}L`} subtitle="Combined team pipeline" icon={TrendingUp} color="emerald" trend="+14.2%" />
        <KPICard title="Pending Approvals" value={pendingCount} subtitle="Requires your signoff" icon={CheckSquare} color="amber" />
        <KPICard title="High Discount Deals" value={highDiscountDeals.length} subtitle="Exceeds tier baseline" icon={AlertTriangle} color="rose" />
        <KPICard title="At-Risk Deals" value={atRiskDeals.length} subtitle="Risk score > 60" icon={AlertTriangle} color="indigo" />
      </div>

      {/* My Sales Team Widget */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            My Sales Team
          </h2>
          {selectedRepFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedRepFilter('ALL')}
              className="text-xs text-indigo-400 font-semibold hover:underline"
            >
              Clear Filter ({selectedRepFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesTeam.map((rep) => (
            <div
              key={rep.name}
              onClick={() => setSelectedRepFilter(rep.name.split(' ')[0])}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                selectedRepFilter.toLowerCase() === rep.name.split(' ')[0].toLowerCase()
                  ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-900/30'
                  : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">{rep.name}</p>
                <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                  Active
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-indigo-300 mt-2">₹{(rep.pipeline / 100000).toFixed(1)}L</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{rep.deals} Active Deals</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approval Queue */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Manager Approval Queue</h2>
          <span className="text-xs text-amber-400 font-bold">{approvals.length} Pending Signoffs</span>
        </div>

        {approvals.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-xs text-slate-400">All manager approval requests are caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quotation</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Deal Value</th>
                  <th className="p-3">Risk Factor</th>
                  <th className="p-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {approvals.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{app.quotation?.quoteNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{app.salesRep?.name}</td>
                    <td className="p-3">{app.quotation?.customer?.company}</td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{app.quotation?.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={app.riskLevel} score={app.riskScore} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                      >
                        Review & Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ApprovalModal
        isOpen={!!selectedApproval}
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onSuccess={fetchData}
      />

    </div>
  );
};

export default SalesManagerDashboard;
