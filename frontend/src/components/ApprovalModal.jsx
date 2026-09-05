import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, CheckCircle, XCircle, RotateCcw, ShieldAlert, History } from 'lucide-react';
import { RiskBadge, StatusBadge } from './StatusBadge';

const ApprovalModal = ({ isOpen, approval, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !approval) return null;

  const quote = approval.quotation;

  const handleAction = async (actionType) => {
    if (!reason && actionType !== 'APPROVE') {
      toast.error('Please provide a reason for this decision');
      return;
    }

    setSubmitting(true);
    try {
      await API.post(`/approvals/${approval._id}/action`, {
        action: actionType,
        reason: reason || 'Approved via DealFlow360 platform'
      });
      toast.success(`Approval decision '${actionType}' processed successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Approval Request: {quote?.quoteNumber}</h2>
              <RiskBadge level={approval.riskLevel} score={approval.riskScore} />
            </div>
            <p className="text-xs text-slate-400">Review quotation items, risk factor breakdowns, and audit trail</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Customer & Rep Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Customer Account</p>
              <p className="text-sm font-bold text-slate-200">{quote?.customer?.company}</p>
              <p className="text-xs text-slate-400">{quote?.customer?.name} — <span className="text-amber-400 font-semibold">{quote?.customer?.tier} Tier</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Sales Representative</p>
              <p className="text-sm font-bold text-slate-200">{approval.salesRep?.name}</p>
              <p className="text-xs text-indigo-400 font-bold mt-0.5">Total Deal Value: ₹{quote?.grandTotal?.toLocaleString()}</p>
            </div>
          </div>

          {/* Transparent Risk Reasons Breakdown */}
          <div className="bg-rose-950/30 border border-rose-800/40 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              Risk Analysis Factors (Score: {approval.riskScore}/100)
            </div>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-2">
              {approval.riskReasons?.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quotation Line Items</h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {quote?.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-white">{item.product?.name}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">₹{item.unitPrice?.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`font-bold ${item.approvalRequired ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.discountPercent}%
                        </span>
                        {item.approvalRequired && <p className="text-[10px] text-rose-400 mt-0.5">{item.breachReason}</p>}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-200">₹{item.lineTotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit History */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Approval Audit Trail
            </h3>
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
              {approval.auditTrail?.map((audit, i) => (
                <div key={i} className="text-xs border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-indigo-300">{audit.role}: {audit.action}</span>
                    <span className="text-[10px] text-slate-500">{new Date(audit.timestamp).toLocaleString()}</span>
                  </div>
                  {audit.reason && <p className="text-[11px] text-slate-400 mt-0.5">"{audit.reason}"</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Decision Reason Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Approval Comments / Decision Reason</label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter decision rationale or changes requested..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction('RETURN_FOR_CHANGES')}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 hover:bg-amber-900/60 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Return for Changes
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('REJECT')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:bg-rose-900/60 transition flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject Deal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('APPROVE')}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve Quotation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApprovalModal;
