import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import FulfillmentModal from '../components/FulfillmentModal';
import { ShieldAlert, Truck, FileCheck2, Repeat, Warehouse, ArrowUpRight, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

const FinanceOperationsDashboard = () => {
  const [highRiskApprovals, setHighRiskApprovals] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, fulRes, boRes, invRes, subRes, whRes] = await Promise.all([
        API.get('/approvals'),
        API.get('/fulfillment'),
        API.get('/fulfillment/backorders'),
        API.get('/invoices'),
        API.get('/subscriptions'),
        API.get('/admin/warehouses')
      ]);

      setHighRiskApprovals(appRes.data.filter(a => a.currentStep === 'FINANCE_OPERATIONS' || a.riskLevel === 'HIGH'));
      setFulfillments(fulRes.data);
      setBackorders(boRes.data);
      setInvoices(invRes.data);
      setSubscriptions(subRes.data);
      setWarehouses(whRes.data);
    } catch (err) {
      toast.error('Failed to load Finance & Operations metrics');
    } finally {
      setLoading(false);
    }
  };

  const pendingInvoices = invoices.filter(i => i.paymentStatus !== 'Paid');
  const awaitingFulfillment = fulfillments.filter(f => f.status === 'Awaiting Allocation' || f.status === 'Partially Fulfilled');

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Finance & Operations Dashboard</h1>
        <p className="text-xs text-slate-400">High-risk deal approvals, warehouse inventory allocation, backorders, and partial invoice reconciliation</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="High-Risk Approvals" value={highRiskApprovals.length} subtitle="Requires Finance signoff" icon={ShieldAlert} color="rose" />
        <KPICard title="Awaiting Fulfillment" value={awaitingFulfillment.length} subtitle="Orders needing allocation" icon={Truck} color="indigo" />
        <KPICard title="Active Backorders" value={backorders.length} subtitle="Stock shortage items" icon={AlertOctagon} color="amber" />
        <KPICard title="Pending Invoices" value={pendingInvoices.length} subtitle="Awaiting payment" icon={FileCheck2} color="cyan" />
      </div>

      {/* High Risk Approval Queue Section */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            High-Risk Approval Requests (2nd Tier Workflow)
          </h2>
          <span className="text-xs text-rose-400 font-bold">{highRiskApprovals.length} Pending</span>
        </div>

        {highRiskApprovals.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No high-risk approvals pending Finance signoff.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quote ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Rep</th>
                  <th className="p-3">Deal Value</th>
                  <th className="p-3">Risk Factor</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {highRiskApprovals.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{app.quotation?.quoteNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{app.quotation?.customer?.company}</td>
                    <td className="p-3 text-slate-300">{app.salesRep?.name}</td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{app.quotation?.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={app.riskLevel} score={app.riskScore} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition"
                      >
                        Finance Approval
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders Awaiting Fulfillment & Warehouse Stock Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Orders Table */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              Orders Awaiting Stock Allocation
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quotation</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {fulfillments.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{f.quotation?.quoteNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{f.customer?.company}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/60 border border-blue-800/60 text-blue-400">
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedFulfillmentId(f._id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                      >
                        Allocate Stock / Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warehouses Quick Stock Panel */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-emerald-400" />
            Warehouse Network
          </h2>

          <div className="space-y-3">
            {warehouses.map((wh) => (
              <div key={wh._id} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{wh.name}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">{wh.location}</span>
                </div>
                <p className="text-[11px] text-slate-400">Capacity: {wh.capacity.toLocaleString()} units</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modals */}
      <ApprovalModal
        isOpen={!!selectedApproval}
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onSuccess={fetchData}
      />

      <FulfillmentModal
        isOpen={!!selectedFulfillmentId}
        fulfillmentId={selectedFulfillmentId}
        onClose={() => setSelectedFulfillmentId(null)}
        onSuccess={fetchData}
      />

    </div>
  );
};

export default FinanceOperationsDashboard;
