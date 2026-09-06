import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, DollarSign, CreditCard, Calendar, FileText, CheckCircle2 } from 'lucide-react';

const RecordPaymentModal = ({ isOpen, invoice, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !invoice) return null;

  const grandTotal = invoice.grandTotal || 0;
  const amountPaid = invoice.amountPaid || 0;
  const remaining = Math.max(0, grandTotal - amountPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payNum = Number(amount);

    if (!payNum || payNum <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    if (payNum > remaining + 0.01) {
      toast.error(`Payment amount ₹${payNum.toLocaleString()} exceeds remaining balance ₹${remaining.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/finance/payments', {
        invoiceId: invoice._id,
        amount: payNum,
        paymentMethod,
        transactionReference,
        notes,
        paymentDate
      });

      toast.success(`Payment of ₹${payNum.toLocaleString()} recorded and reconciled successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
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
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Record Payment Transaction
            </h3>
            <p className="text-xs text-muted-foreground">Invoice: <span className="font-bold text-foreground">{invoice.invoiceNumber}</span></p>
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
            <span className="text-muted-foreground">Invoice Total:</span>
            <span className="font-extrabold text-foreground">₹{grandTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount Already Paid:</span>
            <span className="font-bold text-emerald-500">₹{amountPaid.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1">
            <span className="font-bold text-foreground">Remaining Balance:</span>
            <span className="font-black text-rose-500">₹{remaining.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">Payment Amount (₹)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max ₹${remaining}`}
                required
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500 font-extrabold"
              />
              <button
                type="button"
                onClick={() => setAmount(remaining.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/30"
              >
                Pay Full Balance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-foreground mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="CREDIT_CARD">Credit Card / Debit Card</option>
                <option value="UPI">UPI / Digital Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">Transaction Ref / UTR Number</label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g. UTR129847192847"
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">Reconciliation Notes (Optional)</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add payment reconciliation or bank verification note..."
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RecordPaymentModal;
