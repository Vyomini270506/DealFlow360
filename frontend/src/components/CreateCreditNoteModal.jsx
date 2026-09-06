import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, FileText, CheckCircle2 } from 'lucide-react';

const CreateCreditNoteModal = ({ isOpen, invoice, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('BILLING_CORRECTION');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cnAmount = Number(amount);

    if (!cnAmount || cnAmount <= 0) {
      toast.error('Please enter a valid credit note amount');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/finance/credit-notes', {
        invoiceId: invoice._id,
        amount: cnAmount,
        reason,
        description
      });

      toast.success(`Credit Note of ₹${cnAmount.toLocaleString()} issued successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue credit note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-foreground">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Issue Authorized Credit Note
            </h3>
            <p className="text-xs text-muted-foreground">Original Invoice: <span className="font-bold text-foreground">{invoice.invoiceNumber}</span></p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-bold text-foreground">{invoice.customer?.company || invoice.customer?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Invoice Grand Total:</span>
            <span className="font-extrabold text-foreground">₹{(invoice.grandTotal || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Credit Note Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">Adjustment / Credit Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500 font-extrabold"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">Reason Code</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="BILLING_CORRECTION">Billing Correction</option>
              <option value="PRICING_CORRECTION">Pricing Correction</option>
              <option value="CANCELLED_QUANTITY">Cancelled Quantity</option>
              <option value="REFUND">Customer Refund</option>
              <option value="APPROVED_ADJUSTMENT">Approved Commercial Adjustment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">Description / Justification</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide reason for financial adjustment..."
              required
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Issuing...' : 'Issue Credit Note'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CreateCreditNoteModal;
