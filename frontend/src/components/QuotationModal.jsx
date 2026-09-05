import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, Plus, Trash2, ShieldAlert, Sparkles, ShoppingBag } from 'lucide-react';
import { RiskBadge } from './StatusBadge';

const QuotationModal = ({ isOpen, onClose, onSuccess }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product: '', quantity: 1, unitPrice: 0, discountPercent: 0, category: 'Hardware' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        API.get('/admin/customers'),
        API.get('/admin/products')
      ]);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
      if (custRes.data.length > 0) setSelectedCustomerId(custRes.data[0]._id);
    } catch (err) {
      toast.error('Failed to load customers and products');
    }
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
  const customerTier = selectedCustomer ? selectedCustomer.tier : 'Bronze';

  // Allowed discount calculation
  const getAllowedDiscount = (category) => {
    const tierLimits = { Gold: 15, Silver: 10, Bronze: 5 };
    const catLimits = { Hardware: 15, Services: 10, Software: 20 };

    const tLimit = tierLimits[customerTier] || 5;
    const cLimit = catLimits[category] || 15;
    return Math.min(tLimit, cLimit);
  };

  const handleProductChange = (index, productId) => {
    const prod = products.find(p => p._id === productId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product: productId,
      unitPrice: prod.unitPrice,
      category: prod.category
    };
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, unitPrice: 0, discountPercent: 0, category: 'Hardware' }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Upsell Suggestions based on selected categories
  const selectedCategories = items.map(i => i.category);
  const hasHardware = selectedCategories.includes('Hardware');
  const hasServices = selectedCategories.includes('Services');

  const suggestions = [];
  if (hasHardware && !hasServices) {
    const serviceProd = products.find(p => p.category === 'Services');
    if (serviceProd) suggestions.push({ text: `Cross-sell: Add '${serviceProd.name}' for full deployment coverage`, product: serviceProd });
  }

  // Live Calculations
  let subtotal = 0;
  let totalDiscount = 0;
  let totalBreaches = 0;

  items.forEach(item => {
    const q = Number(item.quantity) || 1;
    const p = Number(item.unitPrice) || 0;
    const d = Number(item.discountPercent) || 0;

    subtotal += p * q;
    totalDiscount += (p * (d / 100)) * q;

    const allowed = getAllowedDiscount(item.category);
    if (d > allowed) totalBreaches++;
  });

  const afterDiscount = subtotal - totalDiscount;
  const tax = Number((afterDiscount * 0.18).toFixed(2));
  const grandTotal = Number((afterDiscount + tax).toFixed(2));

  // Risk calculation preview
  let estRisk = 0;
  if (totalBreaches > 0) estRisk += 40;
  if (grandTotal > 500000) estRisk += 20;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const invalidItem = items.find(i => !i.product);
    if (invalidItem) {
      toast.error('Please select a product for all line items');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        items,
        notes
      };
      await API.post('/quotations', payload);
      toast.success('Quotation draft created successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Create New Quotation
            </h2>
            <p className="text-xs text-slate-400">Configure deal products, apply customer tier discounts, and analyze risk score</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Customer Selection Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.company} ({c.name}) — {c.tier} Tier</option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-200">{selectedCustomer.company}</p>
                  <p className="text-[11px] text-slate-400">{selectedCustomer.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-400">
                    {selectedCustomer.tier} Tier ({selectedCustomer.tier === 'Gold' ? '15%' : selectedCustomer.tier === 'Silver' ? '10%' : '5%'} max)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upsell Suggestion Banner */}
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-700/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <p className="text-xs text-indigo-200">{suggestions[0].text}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const p = suggestions[0].product;
                  setItems([...items, { product: p._id, quantity: 1, unitPrice: p.unitPrice, discountPercent: 0, category: p.category }]);
                }}
                className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
              >
                + Add Suggestion
              </button>
            </div>
          )}

          {/* Product Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Line Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const allowed = getAllowedDiscount(item.category);
                const isBreach = item.discountPercent > allowed;

                return (
                  <div key={idx} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Product</label>
                        <select
                          value={item.product}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name} (₹{p.unitPrice.toLocaleString()})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Discount % <span className="text-[9px] text-slate-500">(Max {allowed}%)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                          className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-center font-bold ${
                            isBreach ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-emerald-400'
                          }`}
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Total</label>
                        <p className="text-xs font-bold text-slate-200 py-1.5">
                          ₹{((item.unitPrice * (1 - item.discountPercent / 100)) * item.quantity).toLocaleString()}
                        </p>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Discount Governance Violation Alert */}
                    {isBreach && (
                      <div className="flex items-center gap-2 text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Discount exceeds allowed limit by <strong>{(item.discountPercent - allowed).toFixed(1)} percentage points</strong>. Requires Manager / Finance Approval.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Deal Notes & Terms</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special customer terms, delivery requests..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
            />
          </div>

          {/* Calculation Summary Footer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Live Risk Preview</p>
                <RiskBadge score={estRisk} />
              </div>
              {totalBreaches > 0 && (
                <span className="text-xs text-amber-400 font-semibold">
                  ⚠️ {totalBreaches} discount breach(es) detected
                </span>
              )}
            </div>

            <div className="text-right space-y-0.5">
              <p className="text-xs text-slate-400">Subtotal: <span className="text-slate-200 font-semibold">₹{subtotal.toLocaleString()}</span></p>
              <p className="text-xs text-slate-400">Discount: <span className="text-emerald-400 font-semibold">-₹{totalDiscount.toLocaleString()}</span></p>
              <p className="text-xs text-slate-400">Tax (18%): <span className="text-slate-200 font-semibold">₹{tax.toLocaleString()}</span></p>
              <p className="text-base font-extrabold text-white pt-1">Grand Total: <span className="text-indigo-400">₹{grandTotal.toLocaleString()}</span></p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition"
            >
              {saving ? 'Creating Draft...' : 'Save Quotation Draft'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default QuotationModal;
