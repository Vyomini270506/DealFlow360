import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, Truck, Warehouse, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FulfillmentModal = ({ isOpen, fulfillmentId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && fulfillmentId) {
      fetchDetail();
    }
  }, [isOpen, fulfillmentId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [fulRes, whRes] = await Promise.all([
        API.get(`/fulfillment/${fulfillmentId}`),
        API.get('/admin/warehouses')
      ]);
      setData(fulRes.data);
      setWarehouses(whRes.data);
    } catch (err) {
      toast.error('Failed to fetch fulfillment detail');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !data) return null;

  const { fulfillment, backorders } = data;

  const handleGenerateInvoice = async () => {
    try {
      await API.post(`/invoices/generate/${fulfillment._id}`);
      toast.success('Invoice generated successfully based on fulfilled stock items!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              Fulfillment Detail & Warehouse Allocation
            </h2>
            <p className="text-xs text-slate-400">Order #{fulfillment?.quotation?.quoteNumber} — Customer: {fulfillment?.customer?.company}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Status Overview Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Fulfillment Status</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800/60 text-blue-400 mt-1 inline-block">
                {fulfillment.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Quotation Reference</p>
              <p className="text-sm font-extrabold text-indigo-400">{fulfillment?.quotation?.quoteNumber}</p>
            </div>
          </div>

          {/* Items & Warehouse Multi-Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Warehouse Stock Allocations</h3>
            
            {fulfillment?.items?.map((item, idx) => (
              <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.product?.name}</h4>
                    <p className="text-xs text-slate-400">Requested: <span className="text-slate-200 font-bold">{item.requestedQuantity}</span> units</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">Fulfilled: {item.fulfilledQuantity}</span>
                    {item.backorderQuantity > 0 && (
                      <span className="text-xs font-bold text-rose-400 ml-3">Backordered: {item.backorderQuantity}</span>
                    )}
                  </div>
                </div>

                {/* Warehouse Breakdown Pills */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Allocated Warehouses</p>
                  {item.allocations?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No warehouse stock allocated yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {item.allocations?.map((alloc, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                          <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-slate-200">{alloc.warehouse?.name || 'Warehouse Hub'}</span>
                          <span className="font-bold text-indigo-400">({alloc.quantity} units)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Backorders Section */}
          {backorders?.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <AlertOctagon className="w-4 h-4" /> Backorder Logged
              </div>
              {backorders.map((bo, i) => (
                <div key={i} className="text-xs text-slate-300 flex items-center justify-between bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <span>{bo.product?.name}</span>
                  <span className="font-bold text-rose-400">{bo.quantity} units needed</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Close
          </button>

          {(user.role === 'FINANCE_OPERATIONS' || user.role === 'ADMIN') && (
            <button
              onClick={handleGenerateInvoice}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Generate Invoice for Shipped Stock
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default FulfillmentModal;
