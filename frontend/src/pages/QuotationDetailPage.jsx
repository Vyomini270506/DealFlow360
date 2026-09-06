import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { ArrowLeft, ShieldAlert, History, MessageSquare, CheckCircle, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';

const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeNegotiation, setActiveNegotiation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/quotations/${id}`);
      setData(data);
    } catch (err) {
      toast.error('Failed to load quotation detail');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-xs text-slate-500">Loading quotation details...</div>;
  if (!data || !data.quotation) return <div className="p-6 text-xs text-rose-400">Quotation not found</div>;

  const { quotation, approval } = data;

  const handleSubmitForApproval = async () => {
    try {
      await API.post(`/quotations/${quotation._id}/submit`);
      toast.success('Quotation submitted for approval!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveNegotiation(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold text-xs flex items-center gap-1.5 hover:bg-indigo-900/60 transition"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Open Negotiation Thread
          </button>

          {quotation.status === 'Draft' && (
            <button
              onClick={handleSubmitForApproval}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Send className="w-4 h-4" /> Submit for Approval
            </button>
          )}
        </div>
      </div>

      {/* Main Detail Header Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white">{quotation.quoteNumber}</h1>
              <StatusBadge status={quotation.status} />
              <RiskBadge level={quotation.riskLevel} score={quotation.riskScore} />
            </div>
            <p className="text-xs text-slate-400 mt-1">Created on {new Date(quotation.createdAt).toLocaleString()}</p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold">Grand Total Value</p>
            <h2 className="text-2xl font-extrabold text-indigo-400">₹{quotation.grandTotal?.toLocaleString()}</h2>
          </div>
        </div>

        {/* Customer & Sales Rep Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Customer Account</p>
            <p className="text-sm font-bold text-slate-200 mt-1">{quotation.customer?.company}</p>
            <p className="text-xs text-slate-400">{quotation.customer?.name} ({quotation.customer?.email})</p>
            <span className="mt-2 inline-block text-[11px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">
              {quotation.customer?.tier} Tier Customer
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Assigned Sales Representative</p>
            <p className="text-sm font-bold text-slate-200 mt-1">{quotation.salesRep?.name}</p>
            <p className="text-xs text-slate-400">{quotation.salesRep?.email}</p>
          </div>
        </div>
      </div>

      {/* Transparent Risk Score Breakdown Banner */}
      <div className="bg-rose-950/25 border border-rose-800/40 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            Transparent Rule-Based Risk Engine Breakdown
          </div>
          <span className="text-xs font-bold text-rose-400 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/60">
            Risk Score: {quotation.riskScore} / 100 ({quotation.riskLevel})
          </span>
        </div>

        <div className="space-y-1 text-xs text-slate-300">
          <p className="font-semibold text-slate-400">Identified Risk Factors:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
            {quotation.riskReasons?.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Products Table with Allowed vs Actual Discount Governance */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quotation Line Items & Discount Validation</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Unit Price</th>
                <th className="p-3">Allowed Discount</th>
                <th className="p-3">Actual Discount</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {quotation.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-white">{item.product?.name || item.productName || item.product?.sku || 'Product'}</td>
                  <td className="p-3 text-slate-400">{item.product?.category || 'Standard'}</td>
                  <td className="p-3">{item.quantity || 1}</td>
                  <td className="p-3">₹{(item.unitPrice || item.product?.unitPrice || 0).toLocaleString()}</td>
                  <td className="p-3 text-slate-400 font-semibold">{item.allowedDiscountPercent ?? 0}%</td>
                  <td className="p-3">
                    <span className={`font-bold ${item.approvalRequired ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.discountPercent ?? 0}%
                    </span>
                    {item.approvalRequired && (
                      <p className="text-[10px] text-rose-400 mt-0.5">{item.breachReason || 'Requires Approval'}</p>
                    )}
                  </td>
                  <td className="p-3 text-right font-extrabold text-indigo-300">₹{(item.lineTotal || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Timeline */}
      {approval && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Approval Workflow Audit Trail
          </h2>

          <div className="space-y-3">
            {approval.auditTrail?.map((audit, i) => (
              <div key={i} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs flex items-start justify-between">
                <div>
                  <span className="font-bold text-indigo-300">{audit.role}: {audit.action}</span>
                  {audit.reason && <p className="text-slate-400 mt-1">"{audit.reason}"</p>}
                </div>
                <span className="text-[10px] text-slate-500">{new Date(audit.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation Drawer */}
      <NegotiationDrawer
        isOpen={activeNegotiation}
        quotationId={quotation._id}
        onClose={() => setActiveNegotiation(false)}
        onSuccess={fetchDetail}
      />

    </div>
  );
};

export default QuotationDetailPage;
