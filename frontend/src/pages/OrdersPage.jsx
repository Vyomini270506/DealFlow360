import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { 
  ShoppingBag, 
  Building2, 
  User, 
  FileText, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  FileCheck2, 
  Search, 
  RefreshCw, 
  Eye, 
  X,
  DollarSign,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/orders');
      setOrders(data || []);
    } catch (err) {
      toast.error('Failed to load orders from MongoDB');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const ordNum = order.orderNumber || '';
    const custName = order.customer?.company || order.customer?.name || '';
    const repName = order.salesRep?.name || '';
    
    const matchesSearch = 
      ordNum.toLowerCase().includes(q) || 
      custName.toLowerCase().includes(q) || 
      repName.toLowerCase().includes(q);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && order.orderStatus === statusFilter;
  });

  // KPI Computations
  const totalOrdersCount = orders.length;
  const fulfilledCount = orders.filter(o => o.orderStatus === 'FULFILLED').length;
  const processingCount = orders.filter(o => o.orderStatus === 'PROCESSING' || o.orderStatus === 'CONFIRMED').length;
  const backorderCount = orders.filter(o => o.orderStatus === 'PARTIALLY_FULFILLED').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'FULFILLED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            FULFILLED
          </span>
        );
      case 'PARTIALLY_FULFILLED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-extrabold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            BACKORDERED / PARTIAL
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-extrabold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            PROCESSING
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-extrabold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            CONFIRMED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2 backdrop-blur-md shadow-sm">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>MongoDB Order Processing Module</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Customer Orders Ledger</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {totalOrdersCount}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real MongoDB Order records generated from closed customer deals, including product allocations, discount breakdowns, line item totals, and invoice links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel rounded-xl px-4 py-2 text-right border border-emerald-500/30 shadow-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders Volume</p>
            <p className="text-lg font-black text-emerald-400 tracking-tight font-mono-numeric">
              ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="p-2.5 glass-panel hover:bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Orders</p>
            <p className="text-xl font-black text-white mt-1">{totalOrdersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Fulfilled Orders</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{fulfilledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Processing / Confirmed</p>
            <p className="text-xl font-black text-blue-400 mt-1">{processingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Partial / Backordered</p>
            <p className="text-xl font-black text-amber-400 mt-1">{backorderCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, customer, or sales rep..."
            className="w-full glass-panel border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'CONFIRMED', 'PROCESSING', 'FULFILLED', 'PARTIALLY_FULFILLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                statusFilter === st
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                  : 'glass-panel border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
          Fetching real MongoDB Order documents...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
          <p className="text-sm font-bold text-slate-300">No Orders Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No matching MongoDB order records exist for the selected filter query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="glass-panel-interactive rounded-2xl p-5 shadow-xl space-y-4 relative"
            >
              {/* Top Banner */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.orderStatus)}
                  </div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 mt-1">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{order.customer?.company || order.customer?.name || 'Customer'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{order.customer?.email || 'N/A'}</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Grand Total</p>
                  <p className="text-lg font-black text-emerald-400 font-mono-numeric mt-0.5">
                    ₹{order.grandTotal?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordered Products</p>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-indigo-400" />
                        <span><strong>{item.quantity}x</strong> {item.product?.name || 'Product'}</span>
                      </span>
                      <span className="font-mono text-slate-400">₹{item.lineTotal?.toLocaleString()} ({item.discountPercent}% disc)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial & Status Links */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3 text-indigo-400" />
                    <span>Invoice:</span>
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {order.invoice?.invoiceNumber || 'Linked'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    <span>Fulfillment:</span>
                  </span>
                  <span className={`font-mono font-bold text-[10px] uppercase ${order.fulfillment?.status === 'BACKORDERED' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {order.fulfillment?.status || 'ALLOCATED'}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assigned Rep: <strong className="text-slate-200">{order.salesRep?.name || 'Sales Rep'}</strong></span>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Inspection Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                  {selectedOrder.orderNumber}
                </span>
                <h2 className="text-lg font-extrabold text-white mt-1">Order Details & Breakdown</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Customer Information</p>
                <p className="font-bold text-white text-sm">{selectedOrder.customer?.company || selectedOrder.customer?.name}</p>
                <p className="text-slate-400">{selectedOrder.customer?.email}</p>
                <p className="text-indigo-400 font-semibold mt-1">Tier: {selectedOrder.customer?.tier || 'N/A'}</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Sales & Contract Info</p>
                <p className="text-slate-300">Sales Rep: <strong>{selectedOrder.salesRep?.name}</strong></p>
                <p className="text-slate-300">Quotation: <strong>{selectedOrder.quotation?.quoteNumber || 'N/A'}</strong></p>
                <p className="text-slate-400 font-mono">Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300 uppercase">Itemized Line Products</p>
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800 text-xs">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{item.product?.name || 'Product'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {item.product?.sku || 'N/A'} | Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-400">₹{item.lineTotal?.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">₹{item.finalUnitPrice?.toLocaleString()} / unit ({item.discountPercent}% off)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>₹{selectedOrder.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18%):</span>
                <span>₹{selectedOrder.tax?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="text-emerald-400">₹{selectedOrder.grandTotal?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersPage;
