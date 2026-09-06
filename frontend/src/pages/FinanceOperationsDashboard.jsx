import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import FulfillmentModal from '../components/FulfillmentModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import CreateCreditNoteModal from '../components/CreateCreditNoteModal';
import DealRescueCenter from '../components/DealRescueCenter';
import { 
  ShieldAlert, 
  Truck, 
  FileCheck2, 
  Repeat, 
  Warehouse, 
  AlertOctagon, 
  DollarSign, 
  Plus, 
  Search, 
  RefreshCw, 
  History, 
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const FinanceOperationsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'payments' | 'fulfillment' | 'backorders' | 'subscriptions' | 'reviews' | 'credit_notes' | 'reconciliation'
  const [invoiceSubTab, setInvoiceSubTab] = useState('ALL'); // 'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE'
  
  const [metrics, setMetrics] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    counts: { totalInvoices: 0, paid: 0, partiallyPaid: 0, unpaid: 0, overdue: 0 }
  });

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [reconciliationAlerts, setReconciliationAlerts] = useState([]);
  const [highRiskApprovals, setHighRiskApprovals] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [creditNoteModalInvoice, setCreditNoteModalInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        invRes,
        payRes,
        cnRes,
        alertsRes,
        appRes,
        fulRes,
        boRes,
        subRes,
        whRes
      ] = await Promise.all([
        API.get('/finance/overview'),
        API.get('/finance/invoices'),
        API.get('/finance/payments'),
        API.get('/finance/credit-notes'),
        API.get('/finance/reconciliation-alerts'),
        API.get('/approvals'),
        API.get('/fulfillment'),
        API.get('/fulfillment/backorders'),
        API.get('/subscriptions'),
        API.get('/admin/warehouses')
      ]);

      setMetrics(metricsRes.data);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setCreditNotes(cnRes.data || []);
      setReconciliationAlerts(alertsRes.data || []);
      setHighRiskApprovals((appRes.data || []).filter(a => a.currentStep === 'FINANCE_OPERATIONS' || a.riskLevel === 'HIGH'));
      setFulfillments(fulRes.data || []);
      setBackorders(boRes.data || []);
      setSubscriptions(subRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      toast.error('Failed to load Finance & Operations workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubInvoice = async (subId) => {
    try {
      const { data } = await API.post(`/finance/subscriptions/${subId}/generate-invoice`);
      toast.success(data.message || 'Subscription invoice generated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate subscription invoice');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    const invNum = inv.invoiceNumber || '';
    const custName = inv.customer?.company || inv.customer?.name || '';

    const matchesSearch = invNum.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
    if (invoiceSubTab === 'ALL') return matchesSearch;
    return matchesSearch && (inv.computedStatus === invoiceSubTab || inv.paymentStatus === invoiceSubTab);
  });

  return (
    <div className="p-6 space-y-6 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Financial Control, Billing & Operations Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Finance & Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real MongoDB financial control, billing ledger, payment reconciliation, warehouse stock allocation, and advisory high-risk reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 glass-panel hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition shadow-xs"
            title="Refresh Finance Workspace"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* DEAL RESCUE CENTER */}
      <DealRescueCenter onSelectDeal={async (recId, recType, actionLabel, itemId, approvalId) => {
        const getId = (v) => v?._id ? v._id.toString() : (v ? v.toString() : '');
        let app = highRiskApprovals.find(a => 
          getId(a._id) === getId(approvalId) || 
          getId(a._id) === getId(recId) || 
          getId(a.quotation?._id || a.quotation) === getId(recId) || 
          getId(a.customerRequest?._id || a.customerRequest) === getId(recId)
        );
        if (!app && (approvalId || recId)) {
          try {
            const { data } = await API.get('/approvals');
            app = (data || []).find(a => 
              getId(a._id) === getId(approvalId) || 
              getId(a._id) === getId(recId) || 
              getId(a.quotation?._id || a.quotation) === getId(recId)
            );
          } catch (e) {}
        }
        if (app) {
          setSelectedApproval(app);
        } else {
          toast.info('Review selected from Deal Rescue Center');
        }
      }} />

      {/* MAIN TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Invoiced</p>
            <p className="text-xl font-black text-foreground mt-1">₹{(metrics.totalInvoiced || 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{metrics.counts?.totalInvoices || 0} Invoices Issued</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Collected</p>
            <p className="text-xl font-black text-emerald-400 mt-1">₹{(metrics.totalCollected || 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-500 font-bold">{metrics.counts?.paid || 0} Fully Paid</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Outstanding Balance</p>
            <p className="text-xl font-black text-amber-400 mt-1">₹{(metrics.outstandingAmount || 0).toLocaleString()}</p>
            <p className="text-[10px] text-amber-500 font-bold">{metrics.counts?.partiallyPaid || 0} Partial / {metrics.counts?.unpaid || 0} Unpaid</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Overdue Receivables</p>
            <p className="text-xl font-black text-rose-400 mt-1">₹{(metrics.overdueAmount || 0).toLocaleString()}</p>
            <p className="text-[10px] text-rose-500 font-bold">{metrics.counts?.overdue || 0} Overdue Invoices</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS BAR (11 SECTIONS) */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-xs font-extrabold scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Overview
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'invoices' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck2 className="w-4 h-4" /> Invoices Ledger ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'payments' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Payments ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('fulfillment')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'fulfillment' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Truck className="w-4 h-4" /> Stock Allocation ({fulfillments.length})
        </button>

        <button
          onClick={() => setActiveTab('backorders')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'backorders' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertOctagon className="w-4 h-4" /> Backorders ({backorders.length})
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'subscriptions' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Repeat className="w-4 h-4" /> Recurring Billing ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reviews' ? 'bg-rose-600 text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> High-Risk Reviews ({highRiskApprovals.length})
        </button>

        <button
          onClick={() => setActiveTab('credit_notes')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'credit_notes' ? 'bg-primary text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" /> Credit Notes ({creditNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reconciliation' ? 'bg-amber-600 text-white shadow' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Anomaly Scanner ({reconciliationAlerts.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Recent Payments Stream */}
            <div className="lg:col-span-8 glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Recent Payment Collections
              </h2>

              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center italic">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Ref</th>
                        <th className="p-3">Invoice</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">UTR / Ref</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.slice(0, 8).map((pay) => (
                        <tr key={pay._id} className="hover:bg-muted/40 transition">
                          <td className="p-3 font-mono font-bold text-foreground">{pay.paymentNumber}</td>
                          <td className="p-3 font-semibold text-primary">{pay.invoice?.invoiceNumber}</td>
                          <td className="p-3 font-medium text-foreground">{pay.customer?.company || pay.customer?.name}</td>
                          <td className="p-3 font-extrabold text-emerald-500">₹{(pay.amount || 0).toLocaleString()}</td>
                          <td className="p-3 text-muted-foreground font-semibold">{pay.paymentMethod}</td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">{pay.transactionReference || 'N/A'}</td>
                          <td className="p-3 text-muted-foreground">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Warehouse Stock Network Panel */}
            <div className="lg:col-span-4 glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-emerald-500" />
                Warehouse Network Control
              </h2>

              <div className="space-y-3">
                {warehouses.map((wh) => (
                  <div key={wh._id} className="bg-card p-3.5 rounded-xl border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">{wh.name}</p>
                      <span className="text-[10px] text-emerald-500 font-semibold">{wh.location}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Operating Capacity: {wh.capacity.toLocaleString()} units</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: INVOICES LEDGER */}
      {activeTab === 'invoices' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              {['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setInvoiceSubTab(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    invoiceSubTab === sub ? 'bg-primary text-white shadow' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice number or customer..."
                className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Invoice Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Deal / Sub</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Remaining</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-muted/40 transition">
                    <td className="p-3 font-bold text-foreground font-mono">{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-foreground">{inv.customer?.company || inv.customer?.name}</td>
                    <td className="p-3 text-muted-foreground font-medium">{inv.quotation?.quoteNumber || inv.subscription?.subscriptionNumber || 'Direct Invoice'}</td>
                    <td className="p-3 font-extrabold text-foreground">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                    <td className="p-3 font-extrabold text-emerald-500">₹{(inv.amountPaid || 0).toLocaleString()}</td>
                    <td className="p-3 font-extrabold text-rose-500">₹{(inv.remainingBalance || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        inv.computedStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                        inv.computedStatus === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                        inv.computedStatus === 'OVERDUE' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {inv.computedStatus || inv.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-3 text-right space-x-2">
                      {inv.computedStatus !== 'PAID' && (
                        <button
                          onClick={() => setPaymentModalInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition"
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        onClick={() => setCreditNoteModalInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow transition"
                      >
                        Credit Note
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS HISTORY */}
      {activeTab === 'payments' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Payment Transactions Audit Ledger
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Payment Ref</th>
                  <th className="p-3">Invoice Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Transaction UTR</th>
                  <th className="p-3">Recorded Date</th>
                  <th className="p-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-muted/40 transition">
                    <td className="p-3 font-mono font-bold text-foreground">{pay.paymentNumber}</td>
                    <td className="p-3 font-semibold text-primary">{pay.invoice?.invoiceNumber}</td>
                    <td className="p-3 font-medium text-foreground">{pay.customer?.company || pay.customer?.name}</td>
                    <td className="p-3 font-extrabold text-emerald-500">₹{(pay.amount || 0).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground font-semibold">{pay.paymentMethod}</td>
                    <td className="p-3 font-mono text-muted-foreground">{pay.transactionReference || 'N/A'}</td>
                    <td className="p-3 text-muted-foreground">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                    <td className="p-3 text-muted-foreground">{pay.recordedBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FULFILLMENT & STOCK ALLOCATION */}
      {activeTab === 'fulfillment' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              Warehouse Multi-Stock Allocation & Fulfillment Ledger
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Quotation / Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fulfillments.map((f) => (
                  <tr key={f._id} className="hover:bg-muted/40 transition">
                    <td className="p-3 font-bold text-foreground">{f.quotation?.quoteNumber || `Fulfill #${f._id.slice(-4)}`}</td>
                    <td className="p-3 font-semibold text-foreground">{f.customer?.company || f.customer?.name}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedFulfillmentId(f._id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                      >
                        Allocate Warehouse Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BACKORDERS QUEUE */}
      {activeTab === 'backorders' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" />
              Stock Shortage & Backorder Queue
            </h2>
          </div>

          {backorders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">No active stock backorders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Quote Ref</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Needed Quantity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Expected Arrival</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {backorders.map((bo) => (
                    <tr key={bo._id} className="hover:bg-muted/40 transition">
                      <td className="p-3 font-semibold text-foreground">{bo.customer?.company || bo.customer?.name}</td>
                      <td className="p-3 font-mono text-primary font-bold">{bo.quotation?.quoteNumber}</td>
                      <td className="p-3 font-bold text-foreground">{bo.product?.name || bo.productName || 'Product'}</td>
                      <td className="p-3 font-bold text-rose-500">{bo.quantity} units</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          {bo.status || 'BACKORDERED'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{bo.estimatedArrival ? new Date(bo.estimatedArrival).toLocaleDateString() : 'Pending Arrival'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: RECURRING BILLING & SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-500" />
              Active Subscription Billing Cycles
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Sub Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Plan / Service</th>
                  <th className="p-3">Recurring Amount</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Next Billing Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-muted/40 transition">
                    <td className="p-3 font-bold font-mono text-foreground">{sub.subscriptionNumber}</td>
                    <td className="p-3 font-semibold text-foreground">{sub.customer?.company || sub.customer?.name}</td>
                    <td className="p-3 text-foreground font-medium">{sub.planName}</td>
                    <td className="p-3 font-extrabold text-emerald-500">₹{(sub.amount || 0).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground font-semibold">{sub.billingFrequency || 'Monthly'}</td>
                    <td className="p-3 text-muted-foreground">{sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        {sub.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleGenerateSubInvoice(sub._id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                      >
                        Generate Cycle Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: HIGH-RISK DISCOUNT REVIEWS (ADVISORY ONLY — NO APPROVE / REJECT BUTTONS) */}
      {activeTab === 'reviews' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                High-Risk Discount Financial Reviews (Advisory Review Workflow)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Finance Operator provides financial advisory support / comments. Final approval decision belongs exclusively to Sales Manager.
              </p>
            </div>
            <span className="text-xs text-rose-500 font-bold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30">
              {highRiskApprovals.length} Pending Review
            </span>
          </div>

          {highRiskApprovals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">No high-risk approvals pending Finance financial review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Quote / Request</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Sales Rep</th>
                    <th className="p-3">Deal Value</th>
                    <th className="p-3">Risk Level & Score</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {highRiskApprovals.map((app) => (
                    <tr key={app._id} className="hover:bg-muted/40 transition">
                      <td className="p-3 font-bold text-foreground">{app.quotation?.quoteNumber || app.customerRequest?.requestNumber || `Ref #${app._id.slice(-4)}`}</td>
                      <td className="p-3 font-semibold text-foreground">{app.customer?.company || app.quotation?.customer?.company || 'Customer'}</td>
                      <td className="p-3 text-muted-foreground font-medium">{app.salesRep?.name}</td>
                      <td className="p-3 font-extrabold text-primary">₹{(app.quotation?.grandTotal || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <RiskBadge level={app.riskLevel} score={app.riskScore} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedApproval(app)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition flex items-center gap-1 ml-auto"
                        >
                          <span>Review Financial Opinion</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: CREDIT NOTES */}
      {activeTab === 'credit_notes' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Issued Financial Credit Notes
            </h2>
          </div>

          {creditNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">No credit notes issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Credit Note Ref</th>
                    <th className="p-3">Original Invoice</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reason Code</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {creditNotes.map((cn) => (
                    <tr key={cn._id} className="hover:bg-muted/40 transition">
                      <td className="p-3 font-mono font-bold text-foreground">{cn.creditNoteNumber}</td>
                      <td className="p-3 font-semibold text-primary">{cn.invoice?.invoiceNumber}</td>
                      <td className="p-3 font-medium text-foreground">{cn.customer?.company || cn.customer?.name}</td>
                      <td className="p-3 font-extrabold text-indigo-400">₹{(cn.amount || 0).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground font-bold">{cn.reason}</td>
                      <td className="p-3 text-muted-foreground italic">{cn.description || 'N/A'}</td>
                      <td className="p-3 text-muted-foreground">{new Date(cn.issuedAt).toLocaleDateString()}</td>
                      <td className="p-3 text-muted-foreground">{cn.issuedBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: FINANCIAL RECONCILIATION ALERTS */}
      {activeTab === 'reconciliation' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Automated Financial Reconciliation & Anomaly Scanner
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
              {reconciliationAlerts.length} Warnings Detected
            </span>
          </div>

          {reconciliationAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">✓ No financial or inventory reconciliation anomalies detected.</p>
          ) : (
            <div className="space-y-3">
              {reconciliationAlerts.map((alert, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-card border border-amber-500/30 flex items-start gap-3 shadow-xs">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-foreground">{alert.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{alert.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
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

      <RecordPaymentModal
        isOpen={!!paymentModalInvoice}
        invoice={paymentModalInvoice}
        onClose={() => setPaymentModalInvoice(null)}
        onSuccess={fetchData}
      />

      <CreateCreditNoteModal
        isOpen={!!creditNoteModalInvoice}
        invoice={creditNoteModalInvoice}
        onClose={() => setCreditNoteModalInvoice(null)}
        onSuccess={fetchData}
      />

    </div>
  );
};

export default FinanceOperationsDashboard;
