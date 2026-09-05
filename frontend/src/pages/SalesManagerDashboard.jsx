import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import { 
  Users, 
  CheckSquare, 
  AlertTriangle, 
  TrendingUp, 
  Filter, 
  CheckCircle2, 
  ShieldCheck, 
  XCircle, 
  ShoppingCart,
  RotateCcw,
  RefreshCw,
  Search,
  Eye,
  FileText,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const RepWorkloadMonitor = ({ teamReps, requests }) => {
  const activeStatuses = ['Pending', 'Submitted', 'Processing', 'In Review', 'Escalated_Manager', 'Approved_Manager', 'Quoted'];

  const getRepWorkload = (repId) => {
    return requests.filter(r => 
      (r.assignedSalesRep?._id === repId || r.assignedSalesRep === repId) && 
      activeStatuses.includes(r.status)
    ).length;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-primary">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Team Workload Distribution & Auto Assignment Monitor
          </h2>
          <p className="text-xs text-muted-foreground">Live count of active product requests per assigned Sales Representative in your team</p>
        </div>
        <span className="text-xs font-bold text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          Auto Load Balancing
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamReps.map((rep) => {
          const workload = getRepWorkload(rep._id);
          return (
            <div key={rep._id} className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{rep.name}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                  {workload} Active Requests
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium truncate">{rep.email}</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(workload * 25, 100)}%` }}
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
  const [customerRequests, setCustomerRequests] = useState([]);
  const [teamReps, setTeamReps] = useState([]);
  const [selectedRequestView, setSelectedRequestView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, MEDIUM, HIGH, APPROVED, REJECTED, CHANGES
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, reqRes] = await Promise.all([
        API.get('/approvals').catch(() => ({ data: [] })),
        API.get('/customer-requests').catch(() => ({ data: [] }))
      ]);

      setApprovals(appRes.data || []);
      setCustomerRequests(reqRes.data || []);

      // Extract team reps from fetched approvals/requests
      const repMap = new Map();
      (appRes.data || []).forEach(a => {
        if (a.salesRep?._id) repMap.set(a.salesRep._id, a.salesRep);
      });
      (reqRes.data || []).forEach(r => {
        if (r.assignedSalesRep?._id) repMap.set(r.assignedSalesRep._id, r.assignedSalesRep);
      });
      setTeamReps(Array.from(repMap.values()));
    } catch (err) {
      toast.error('Failed to load manager dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerRequestAction = async (requestId, action, customComment) => {
    let comment = customComment;
    if (!comment && action === 'REQUEST_CHANGES') {
      comment = window.prompt('Enter negotiation instructions for Sales Representative (e.g., Discount too high, negotiate max 10%):');
      if (comment === null) return;
    }
    try {
      await API.post(`/customer-requests/${requestId}/manager-action`, {
        action,
        comment: comment || (action === 'APPROVE' ? 'Approved by Sales Manager' : 'Rejected by Sales Manager')
      });

      toast.success(`Manager decision '${action}' saved successfully!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Manager action failed');
    }
  };

  const handleDiscardRequest = async (requestId) => {
    try {
      await API.post(`/customer-requests/${requestId}/discard`);
      toast.info('Request discarded and moved to Discarded Records.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard request');
    }
  };

  // Metrics Calculations
  const closedCount = customerRequests.filter(r => r.status === 'Closed' || r.status === 'CLOSED').length;
  const pendingRequests = customerRequests.filter(r => (r.status === 'Escalated_Manager' || r.status === 'Pending' || r.status === 'Submitted') && r.status !== 'Closed' && r.status !== 'CLOSED');
  const pendingApprovalsList = approvals.filter(a => a.managerApproval?.status === 'PENDING');
  const totalPending = pendingRequests.length + pendingApprovalsList.length;

  const mediumRiskCount = customerRequests.filter(r => r.riskLevel === 'MEDIUM' && r.status !== 'Closed' && r.status !== 'CLOSED').length + approvals.filter(a => a.riskLevel === 'MEDIUM').length;
  const highRiskCount = customerRequests.filter(r => r.riskLevel === 'HIGH' && r.status !== 'Closed' && r.status !== 'CLOSED').length + approvals.filter(a => a.riskLevel === 'HIGH').length;

  const approvedCount = customerRequests.filter(r => (r.status === 'Approved_Manager' || r.status === 'Quoted') && r.status !== 'Closed' && r.status !== 'CLOSED').length + approvals.filter(a => a.managerApproval?.status === 'APPROVED').length;
  const rejectedCount = customerRequests.filter(r => r.status === 'Rejected_Manager').length + approvals.filter(a => a.managerApproval?.status === 'REJECTED').length;

  // Filtered Requests Queue
  const filteredRequests = customerRequests.filter(r => {
    if (filterStatus === 'CLOSED') return r.status === 'Closed' || r.status === 'CLOSED';
    if (r.status === 'Closed' || r.status === 'CLOSED') return false;
    if (filterStatus === 'PENDING') return r.status === 'Escalated_Manager' || r.status === 'Pending';
    if (filterStatus === 'MEDIUM') return r.riskLevel === 'MEDIUM';
    if (filterStatus === 'HIGH') return r.riskLevel === 'HIGH';
    if (filterStatus === 'APPROVED') return r.status === 'Approved_Manager' || r.status === 'Quoted';
    if (filterStatus === 'REJECTED') return r.status === 'Rejected_Manager';
    if (filterStatus === 'CHANGES') return r.status === 'Negotiation_Required';
    return true;
  }).filter(r => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      r.requestNumber?.toLowerCase().includes(s) ||
      r.customer?.company?.toLowerCase().includes(s) ||
      r.customer?.name?.toLowerCase().includes(s) ||
      r.assignedSalesRep?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Sales Manager Dashboard</h1>
          <p className="text-xs text-muted-foreground">Oversee team pipeline performance, manage medium/high risk escalated approvals, and enforce discount limits</p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs inline-flex items-center gap-1.5 transition shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* KPI METRICS GRID (Interactive Cards for Filtering) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div onClick={() => setFilterStatus('PENDING')} className="cursor-pointer">
          <KPICard title="Pending Approvals" value={totalPending} subtitle="Action required" icon={CheckSquare} color="amber" />
        </div>
        <div onClick={() => setFilterStatus('MEDIUM')} className="cursor-pointer">
          <KPICard title="Medium Risk" value={mediumRiskCount} subtitle="Requires review" icon={AlertTriangle} color="indigo" />
        </div>
        <div onClick={() => setFilterStatus('HIGH')} className="cursor-pointer">
          <KPICard title="High Risk" value={highRiskCount} subtitle="Compulsory manager signoff" icon={AlertTriangle} color="rose" />
        </div>
        <div onClick={() => setFilterStatus('APPROVED')} className="cursor-pointer">
          <KPICard title="Approved Deals" value={approvedCount} subtitle="Manager approved" icon={ShieldCheck} color="emerald" />
        </div>
        <div onClick={() => setFilterStatus('CLOSED')} className="cursor-pointer">
          <KPICard title="Closed Deals" value={closedCount} subtitle="Finalized & confirmed" icon={CheckCircle2} color="emerald" />
        </div>
      </div>

      {/* AUTOMATIC LOAD BALANCING TEAM MONITOR */}
      {teamReps.length > 0 && (
        <RepWorkloadMonitor teamReps={teamReps} requests={customerRequests} />
      )}

      {/* APPROVAL QUEUE & FILTERS */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 border-l-4 border-l-amber-500">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Customer Request Approvals Queue
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Review, approve, reject, or request negotiation on customer product requests</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer, rep, ref..."
                className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary focus:outline-none w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-[11px] font-bold overflow-x-auto">
              {['ALL', 'PENDING', 'MEDIUM', 'HIGH', 'APPROVED', 'REJECTED', 'CHANGES', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterStatus === st ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <div className="py-10 text-center bg-card rounded-xl border border-border">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-muted-foreground">No customer requests match the selected filter ({filterStatus})</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Request Ref</th>
                  <th className="p-3">Assigned Sales Rep</th>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Requested Items</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Manager Status</th>
                  <th className="p-3 text-right">Manager Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredRequests.map((reqItem) => (
                  <tr key={reqItem._id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-bold text-primary">{reqItem.requestNumber}</td>
                    <td className="p-3 font-bold text-foreground">{reqItem.assignedSalesRep?.name || 'Assigned Rep'}</td>
                    <td className="p-3 text-muted-foreground">
                      <p className="font-bold text-foreground">{reqItem.customer?.company || reqItem.customer?.name}</p>
                      <p className="text-[10px] text-amber-500 font-semibold">{reqItem.customer?.tier || 'Gold'} Tier</p>
                    </td>
                    <td className="p-3">
                      {reqItem.items?.map((i, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-bold">{i.quantity}x</span> {i.product?.name || 'Item'} ({i.desiredDiscountPercent}% disc)
                        </div>
                      ))}
                    </td>
                    <td className="p-3">
                      <RiskBadge level={reqItem.riskLevel} score={reqItem.riskScore} />
                    </td>
                    <td className="p-3">
                      {reqItem.status === 'Approved_Manager' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          APPROVED ✓
                        </span>
                      )}
                      {reqItem.status === 'Rejected_Manager' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                          REJECTED ✗
                        </span>
                      )}
                      {reqItem.status === 'Negotiation_Required' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          CHANGES REQUESTED 💬
                        </span>
                      )}
                      {(reqItem.status === 'Escalated_Manager' || reqItem.status === 'Pending' || reqItem.status === 'Submitted') && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          PENDING REVIEW ⏳
                        </span>
                      )}
                      {reqItem.status === 'Quoted' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          QUOTED ✓
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedRequestView(reqItem)}
                        className="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" /> View
                      </button>

                      {reqItem.status !== 'Approved_Manager' && reqItem.status !== 'Quoted' && (
                        <button
                          onClick={() => handleManagerRequestAction(reqItem._id, 'APPROVE')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}

                      {reqItem.status !== 'Negotiation_Required' && reqItem.status !== 'Quoted' && (
                        <button
                          onClick={() => handleManagerRequestAction(reqItem._id, 'REQUEST_CHANGES')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                        </button>
                      )}

                      {reqItem.status !== 'Rejected_Manager' && reqItem.status !== 'Quoted' && (
                        <button
                          onClick={() => handleManagerRequestAction(reqItem._id, 'REJECT')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}

                      <button
                        onClick={() => handleDiscardRequest(reqItem._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold text-xs inline-flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Discard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL FOR CUSTOMER REQUEST REVIEW */}
      {selectedRequestView && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Product Request Approval Review ({selectedRequestView.requestNumber})
                </h3>
                <p className="text-xs text-muted-foreground">Assigned Sales Rep: {selectedRequestView.assignedSalesRep?.name}</p>
              </div>
              <button
                onClick={() => setSelectedRequestView(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="font-bold text-muted-foreground">Customer Account:</span>
                  <p className="font-extrabold text-foreground text-sm">{selectedRequestView.customer?.company || selectedRequestView.customer?.name}</p>
                  <p className="text-amber-500 font-bold">{selectedRequestView.customer?.tier} Tier</p>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground">Risk Level & Score:</span>
                  <div className="mt-1">
                    <RiskBadge level={selectedRequestView.riskLevel} score={selectedRequestView.riskScore} />
                  </div>
                </div>
              </div>

              {selectedRequestView.riskReasons && selectedRequestView.riskReasons.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                  <span className="font-bold">Risk Factors / Breaches:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-foreground">
                    {selectedRequestView.riskReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <span className="font-bold text-muted-foreground">Requested Products & Discounts:</span>
                <div className="space-y-1.5 mt-1.5">
                  {selectedRequestView.items?.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground">{item.product?.name}</p>
                        <p className="text-[11px] text-muted-foreground">Quantity: {item.quantity} units</p>
                      </div>
                      <span className="font-extrabold text-amber-500 text-sm">{item.desiredDiscountPercent}% Disc</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRequestView.message && (
                <div>
                  <span className="font-bold text-muted-foreground">Customer Note:</span>
                  <p className="p-2.5 rounded-xl bg-muted/40 italic text-foreground border border-border mt-1">"{selectedRequestView.message}"</p>
                </div>
              )}

              {selectedRequestView.managerComment && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="font-bold text-amber-500">Previous Manager Decision Comment:</span>
                  <p className="text-foreground mt-0.5">"{selectedRequestView.managerComment}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => setSelectedRequestView(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const reqId = selectedRequestView._id;
                    setSelectedRequestView(null);
                    handleManagerRequestAction(reqId, 'REQUEST_CHANGES');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                </button>
                <button
                  onClick={() => {
                    const reqId = selectedRequestView._id;
                    setSelectedRequestView(null);
                    handleManagerRequestAction(reqId, 'REJECT');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition flex items-center gap-1 shadow"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => {
                    const reqId = selectedRequestView._id;
                    setSelectedRequestView(null);
                    handleManagerRequestAction(reqId, 'APPROVE');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 shadow"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesManagerDashboard;
