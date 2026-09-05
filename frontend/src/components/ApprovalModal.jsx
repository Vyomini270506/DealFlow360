import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, CheckCircle, XCircle, RotateCcw, ShieldAlert, History, MessageSquare, ShoppingCart, FileText, ThumbsUp, ThumbsDown, HelpCircle, MessageCircle } from 'lucide-react';
import { RiskBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

const ApprovalModal = ({ isOpen, approval, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !approval) return null;

  const quote = approval.quotation;
  const custReq = approval.customerRequest;
  const customer = approval.customer || quote?.customer || custReq?.customer;

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
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinanceOpinion = async (decision) => {
    setSubmitting(true);
    try {
      const reqId = custReq?._id || approval.customerRequest?._id || approval.customerRequest;
      if (reqId) {
        await API.post(`/customer-requests/${reqId}/finance-action`, {
          decision,
          comment: reason || `Finance opinion: ${decision}`
        });
      } else {
        await API.post(`/approvals/${approval._id}/action`, {
          action: decision === 'SUPPORT' ? 'APPROVE' : 'RETURN_FOR_CHANGES',
          reason: `Finance opinion: ${decision}. ${reason}`
        });
      }
      toast.success(`Finance opinion '${decision}' recorded! Submitted to Sales Manager for final decision.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit Finance opinion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 text-foreground">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-foreground">Approval Review: {quote?.quoteNumber || 'Quotation Approval'}</h2>
              <RiskBadge level={approval.riskLevel} score={approval.riskScore} />
            </div>
            <p className="text-xs text-muted-foreground">Compare original Customer Product Request against official Sales Quotation</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Customer & Rep Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Customer Account</p>
              <p className="text-sm font-extrabold text-foreground">{customer?.company || customer?.name || 'Customer'}</p>
              <p className="text-xs text-muted-foreground">{customer?.email} — <span className="text-amber-500 font-bold">{customer?.tier || 'Gold'} Tier</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Sales Representative</p>
              <p className="text-sm font-extrabold text-foreground">{approval.salesRep?.name}</p>
              <p className="text-xs text-primary font-extrabold mt-0.5">Total Deal Value: ₹{quote?.grandTotal?.toLocaleString()}</p>
            </div>
          </div>

          {/* SIDE BY SIDE COMPARISON: CUSTOMER REQUEST vs QUOTATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SIDE 1: CUSTOMER REQUEST */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-amber-500" />
                  Original Customer Request
                </h3>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                  {custReq?.requestNumber || 'PR-Direct'}
                </span>
              </div>

              {custReq?.message && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-bold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Customer Note:
                  </span>
                  <p className="mt-0.5 italic">"{custReq.message}"</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">Requested Items & Discounts</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2 text-right">Desired Disc %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {custReq?.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-semibold text-foreground">{item.product?.name || 'Product'}</td>
                          <td className="p-2 font-bold">{item.quantity}</td>
                          <td className="p-2 text-right font-extrabold text-amber-500">{item.desiredDiscountPercent}%</td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan="3" className="p-3 text-center text-muted-foreground text-xs">No request item details recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SIDE 2: QUOTATION */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Official Sales Quotation
                </h3>
                <span className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  {quote?.quoteNumber}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">Quotation Pricing Breakup</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Disc %</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quote?.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-semibold text-foreground">{item.product?.name}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">₹{item.unitPrice?.toLocaleString()}</td>
                          <td className="p-2 font-bold text-emerald-500">{item.discountPercent}%</td>
                          <td className="p-2 text-right font-extrabold text-foreground">₹{item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs space-y-1 text-right pt-1">
                  <p className="text-muted-foreground">Subtotal: <span className="font-bold text-foreground">₹{quote?.subtotal?.toLocaleString()}</span></p>
                  <p className="text-muted-foreground">Total Discount: <span className="font-bold text-rose-500">-₹{quote?.totalDiscount?.toLocaleString()}</span></p>
                  <p className="text-sm font-extrabold text-primary">Grand Total: ₹{quote?.grandTotal?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RISK ANALYSIS & APPROVAL RATIONALE */}
          <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                <ShieldAlert className="w-4 h-4" />
                Risk Analysis Breakdown (Score: {approval.riskScore}/100)
              </div>
              <div className="text-xs text-muted-foreground">
                Requested Disc: <span className="font-bold text-rose-500">{approval.requestedDiscount}%</span> | Tier Allowed: <span className="font-bold text-emerald-500">{approval.allowedDiscount}%</span>
              </div>
            </div>
            <ul className="list-disc list-inside text-xs text-foreground space-y-1 pl-2">
              {approval.riskReasons?.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* AUDIT TRAIL */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" /> Approval Audit Trail
            </h3>
            <div className="space-y-2 bg-muted/40 p-3 rounded-xl border border-border max-h-36 overflow-y-auto">
              {approval.auditTrail?.map((audit, i) => (
                <div key={i} className="text-xs border-b border-border pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{audit.role}: {audit.action}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(audit.timestamp).toLocaleString()}</span>
                  </div>
                  {audit.reason && <p className="text-[11px] text-muted-foreground mt-0.5">"{audit.reason}"</p>}
                </div>
              ))}
            </div>
          </div>

          {/* DECISION REASON TEXTAREA (Hidden for ADMIN) */}
          {user?.role !== 'ADMIN' ? (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Approval Decision Rationale / Comments</label>
              <textarea
                rows="2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter manager decision notes or feedback..."
                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary flex items-center justify-between">
              <span>🔒 Read-Only Audit View Active: Admin monitors approval history without decision capabilities.</span>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        {user?.role === 'ADMIN' ? (
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>Read-Only Platform Audit Log</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white transition shadow"
            >
              Close History View
            </button>
          </div>
        ) : user?.role === 'FINANCE_OPERATIONS' ? (
          <div className="p-4 border-t border-border bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] font-bold text-indigo-400">
              💡 Finance Opinion only. Final decision remains with Sales Manager.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinanceOpinion('SUPPORT')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Support Deal
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinanceOpinion('DO_NOT_SUPPORT')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow"
              >
                <ThumbsDown className="w-3.5 h-3.5" /> Do Not Support
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinanceOpinion('SUGGEST_CHANGES')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Suggest Changes
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinanceOpinion('COMMENT')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-card border border-border text-foreground hover:bg-muted transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-primary" /> Add Comment
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('RETURN_FOR_CHANGES')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Return for Changes
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction('REJECT')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition flex items-center gap-1.5 shadow"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Deal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction('APPROVE')}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Quotation
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ApprovalModal;
