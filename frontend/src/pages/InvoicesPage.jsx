import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { FileCheck2, IndianRupee, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/invoices');
      setInvoices(data);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (invoiceId, grandTotal) => {
    try {
      await API.post(`/invoices/${invoiceId}/payment`, { amount: grandTotal });
      toast.success('Payment of full invoice amount recorded!');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Invoices & Billing Reconciliation</h1>
        <p className="text-xs text-slate-400">Strict Partial Delivery Rule: Only shipped products are billed</p>
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" /> System Invoices List
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading invoices...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Quote Ref</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono text-indigo-400 font-bold">{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{inv.customer?.company}</td>
                    <td className="p-3 text-slate-300">{inv.quotation?.quoteNumber}</td>
                    <td className="p-3 font-extrabold text-white">₹{inv.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        inv.paymentStatus === 'Paid'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                      }`}>
                        {inv.paymentStatus} (Paid: ₹{(inv.amountPaid || 0).toLocaleString()})
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {inv.paymentStatus !== 'Paid' && (
                        <button
                          onClick={() => handleRecordPayment(inv._id, inv.grandTotal)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Record Full Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default InvoicesPage;
