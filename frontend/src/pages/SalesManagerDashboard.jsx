import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import { Users, CheckSquare, AlertTriangle, TrendingUp, Filter, CheckCircle2, ShieldCheck, XCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const RepWorkloadMonitor = ({ quotations }) => {
  const salesReps = [
    { name: 'Rahul Sharma', email: 'rahul@dealflow360.com' },
    { name: 'Priya Patel', email: 'priya@dealflow360.com' },
    { name: 'Aman Gupta', email: 'aman@dealflow360.com' },
    { name: 'Neha Verma', email: 'neha@dealflow360.com' }
  ];

  const activeStatuses = ['Draft', 'Pending Approval', 'Negotiation', 'Approved', 'Confirmed', 'Fulfillment'];

  const getRepWorkload = (repName) => {
    return quotations.filter(q => 
      q.salesRep?.name?.toLowerCase() === repName.toLowerCase() && 
      activeStatuses.includes(q.status)
    ).length;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-primary">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Automatic Least-Workload Assignment Distribution Monitor
          </h2>
          <p className="text-xs text-muted-foreground">Live count of active/pending quotation requests per representative used by the backend engine</p>
        </div>
        <span className="text-xs font-bold text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          Auto Load Balancing
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesReps.map((rep) => {
          const workload = getRepWorkload(rep.name);
          return (
            <div key={rep.name} className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{rep.name}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                  {workload} Active Deals
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium truncate">{rep.email}</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(workload * 20, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SalesManagerDashboard = () => {
  const [approvals, setApprovals] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [escalatedRequests, setEscalatedRequests] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, qRes, reqRes] = await Promise.all([
        API.get('/approvals'),
        API.get('/quotations'),
        API.get('/customer-requests').catch(() => ({ data: [] }))
      ]);

      setApprovals(appRes.data || []);
      setQuotations(qRes.data || []);
      
      const escalated = (reqRes.data || []).filter(r => r.status === 'Escalated_Manager');
      setEscalatedRequests(escalated);
    } catch (err) {
      toast.error('Failed to load manager dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerRequestAction = async (requestId, action) => {
    try {
      await API.post(`/customer-requests/${requestId}/manager-action`, {
        action,
        comment: action === 'APPROVE' ? 'Approved by Sales Manager' : 'Rejected by Sales Manager'
      });

      toast.success(`Product Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Manager action failed');
    }
  };

  const totalTeamSales = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const pendingCount = approvals.filter(a => a.managerApproval?.status === 'PENDING').length + escalatedRequests.length;
  const highDiscountDeals = quotations.filter(q => q.riskReasons?.some(r => r.includes('Discount')));
  const atRiskDeals = quotations.filter(q => q.riskLevel === 'HIGH' || q.riskScore >= 60);

  return (
    <div className="p-6 space-y-6">
      
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Sales Manager Dashboard</h1>
        <p className="text-xs text-muted-foreground">Oversee team pipeline performance, manage medium/high risk escalated approvals, and monitor load balancing</p>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Team Pipeline" value={`₹${(totalTeamSales / 100000).toFixed(1)}L`} subtitle="Combined team pipeline" icon={TrendingUp} color="emerald" trend="+14.2%" />
        <KPICard title="Escalated Approvals" value={pendingCount} subtitle="Requires manager signoff" icon={CheckSquare} color="amber" />
        <KPICard title="High Discount Deals" value={highDiscountDeals.length} subtitle="Exceeds tier baseline" icon={AlertTriangle} color="rose" />
        <KPICard title="At-Risk Deals" value={atRiskDeals.length} subtitle="Risk score > 60" icon={AlertTriangle} color="indigo" />
      </div>

      {/* AUTOMATIC LEAST-WORKLOAD ASSIGNMENT DISTRIBUTION MONITOR */}
      <RepWorkloadMonitor quotations={quotations} />

      {/* ESCALATED PRODUCT REQUESTS APPROVAL QUEUE */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              Escalated Product Requests (Medium/High Risk Signoff)
            </h2>
            <p className="text-xs text-muted-foreground">Product requests escalated by Sales Representatives due to risk score or discount thresholds</p>
          </div>
          <span className="text-xs font-bold text-amber-500 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
            {escalatedRequests.length} Escalated
          </span>
        </div>

        {escalatedRequests.length === 0 ? (
          <div className="p-6 text-center bg-card rounded-xl border border-border">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-muted-foreground">All escalated product request approvals are caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Request Ref</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Requested Discount</th>
                  <th className="p-3">Risk Factors & Reason</th>
                  <th className="p-3 text-right">Manager Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {escalatedRequests.map((reqItem) => (
                  <tr key={reqItem._id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-bold text-primary">{reqItem.requestNumber}</td>
                    <td className="p-3 font-bold">{reqItem.assignedSalesRep?.name}</td>
                    <td className="p-3 text-muted-foreground">{reqItem.customer?.company || reqItem.customer?.name} ({reqItem.customer?.tier})</td>
                    <td className="p-3 font-extrabold text-foreground">
                      {reqItem.items?.map(i => `${i.desiredDiscountPercent}%`).join(', ')}
                    </td>
                    <td className="p-3">
                      <RiskBadge level={reqItem.riskLevel} score={reqItem.riskScore} />
                      <p className="text-[10px] text-rose-500 font-medium mt-0.5">{reqItem.escalationReason}</p>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleManagerRequestAction(reqItem._id, 'APPROVE')}
                        className="px-3 py-1.5 rounded-lg bg-success hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleManagerRequestAction(reqItem._id, 'REJECT')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Manager Quotation Approval Queue */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Quotation Approval Queue</h2>
          <span className="text-xs text-amber-500 font-bold">{approvals.length} Pending Signoffs</span>
        </div>

        {approvals.length === 0 ? (
          <div className="py-8 text-center bg-card rounded-xl border border-border">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground">All manager quotation approval requests are caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Quotation</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Deal Value</th>
                  <th className="p-3">Risk Factor</th>
                  <th className="p-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {approvals.map((app) => (
                  <tr key={app._id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-bold text-foreground">{app.quotation?.quoteNumber}</td>
                    <td className="p-3 font-semibold text-muted-foreground">{app.salesRep?.name}</td>
                    <td className="p-3">{app.quotation?.customer?.company}</td>
                    <td className="p-3 font-extrabold text-primary">₹{app.quotation?.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={app.riskLevel} score={app.riskScore} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow transition"
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
