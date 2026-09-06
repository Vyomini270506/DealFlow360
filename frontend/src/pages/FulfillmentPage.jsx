import React, { useState, useEffect } from 'react';
import API from '../services/api';
import FulfillmentModal from '../components/FulfillmentModal';
import { Truck, Warehouse, AlertOctagon, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

const FulfillmentPage = () => {
  const [fulfillments, setFulfillments] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFulfillmentData();
  }, []);

  const fetchFulfillmentData = async () => {
    setLoading(true);
    try {
      const [fulRes, boRes] = await Promise.all([
        API.get('/fulfillment'),
        API.get('/fulfillment/backorders')
      ]);
      setFulfillments(fulRes.data);
      setBackorders(boRes.data);
    } catch (err) {
      toast.error('Failed to load fulfillment data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Fulfillment & Multi-Warehouse Operations</h1>
        <p className="text-xs text-slate-400">Track order stock allocations, warehouse shipments, and backorder logs</p>
      </div>

      {/* Fulfillment List Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-400" /> Order Fulfillment Status
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading fulfillments...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Order Quote</th>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Fulfillment Status</th>
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
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                      >
                        Allocate / Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backorders Section */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" /> Active Backorder Log
          </h2>
          <span className="text-xs font-bold text-rose-400">{backorders.length} Shortages</span>
        </div>

        {backorders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No pending backorders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Quote Number</th>
                  <th className="p-3">Shortage Product</th>
                  <th className="p-3">Backordered Qty</th>
                  <th className="p-3">Est. Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {backorders.map((bo) => (
                  <tr key={bo._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-slate-200">{bo.customer?.company}</td>
                    <td className="p-3 font-mono text-indigo-400 font-bold">{bo.quotation?.quoteNumber}</td>
                    <td className="p-3 font-bold text-white">{bo.product?.name || bo.productName || bo.product?.sku || 'Product'}</td>
                    <td className="p-3 font-bold text-rose-400">{bo.quantity} units</td>
                    <td className="p-3 text-slate-400">{new Date(bo.estimatedArrival).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FulfillmentModal
        isOpen={!!selectedFulfillmentId}
        fulfillmentId={selectedFulfillmentId}
        onClose={() => setSelectedFulfillmentId(null)}
        onSuccess={fetchFulfillmentData}
      />

    </div>
  );
};

export default FulfillmentPage;
