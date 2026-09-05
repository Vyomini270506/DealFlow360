import React, { useState, useEffect } from 'react';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { Settings, Users, Package, Warehouse as WarehouseIcon, Percent, Sliders, Shield, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [config, setConfig] = useState({ discountTiers: [], categoryLimits: [] });
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editable form states
  const [tierLimits, setTierLimits] = useState({ Bronze: 5, Silver: 10, Gold: 15 });
  const [categoryLimits, setCategoryLimits] = useState({ Hardware: 15, Services: 10, Software: 20 });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [cfgRes, prodRes, whRes, userRes] = await Promise.all([
        API.get('/admin/config'),
        API.get('/admin/products'),
        API.get('/admin/warehouses'),
        API.get('/admin/users')
      ]);

      setConfig(cfgRes.data);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);
      setUsers(userRes.data);

      // Populate form state if returned
      const tMap = {};
      cfgRes.data.discountTiers.forEach(t => { tMap[t.tier] = t.maxDiscountPercentage; });
      if (Object.keys(tMap).length) setTierLimits(prev => ({ ...prev, ...tMap }));

      const cMap = {};
      cfgRes.data.categoryLimits.forEach(c => { cMap[c.category] = c.maxDiscountPercentage; });
      if (Object.keys(cMap).length) setCategoryLimits(prev => ({ ...prev, ...cMap }));

    } catch (err) {
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Save Tier Limits
      for (const [tier, val] of Object.entries(tierLimits)) {
        await API.put('/admin/discount-tier', { tier, maxDiscountPercentage: Number(val) });
      }
      // Save Category Limits
      for (const [category, val] of Object.entries(categoryLimits)) {
        await API.put('/admin/category-limit', { category, maxDiscountPercentage: Number(val) });
      }

      toast.success('Discount governance policies updated in backend!');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to update governance configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin System Configuration</h1>
        <p className="text-xs text-slate-400">Configure customer discount tiers, category limits, catalog products, warehouses, and user permissions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={users.length} subtitle="System accounts" icon={Users} color="indigo" />
        <KPICard title="Product Catalog" value={products.length} subtitle="Active SKUs" icon={Package} color="emerald" />
        <KPICard title="Warehouses" value={warehouses.length} subtitle="Logistics hubs" icon={WarehouseIcon} color="cyan" />
        <KPICard title="Discount Policy Tiers" value="3 Tiers" subtitle="Bronze, Silver, Gold" icon={Percent} color="amber" />
      </div>

      {/* Editable Discount Tiers & Category Limits Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Customer Discount Tiers */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Customer Tier Discount Governance (Max %)
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { tier: 'Bronze', color: 'text-amber-600' },
              { tier: 'Silver', color: 'text-slate-300' },
              { tier: 'Gold', color: 'text-amber-400' },
            ].map((t) => (
              <div key={t.tier} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold ${t.color}`}>{t.tier} Tier Baseline</span>
                  <p className="text-[11px] text-slate-400">Allowed max discount percentage</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tierLimits[t.tier]}
                    onChange={(e) => setTierLimits({ ...tierLimits, [t.tier]: e.target.value })}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-extrabold text-center focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Discount Limits */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Category Limits Governance (Max %)
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { category: 'Hardware' },
              { category: 'Services' },
              { category: 'Software' },
            ].map((c) => (
              <div key={c.category} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200">{c.category} Category Limit</span>
                  <p className="text-[11px] text-slate-400">Maximum allowed category discount</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={categoryLimits[c.category]}
                    onChange={(e) => setCategoryLimits({ ...categoryLimits, [c.category]: e.target.value })}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-extrabold text-center focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Save Governance Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
        >
          <Save className="w-4 h-4" />
          {savingConfig ? 'Updating Backend Governance...' : 'Save Discount Governance Rules'}
        </button>
      </div>

      {/* Product Catalog Overview */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Product Catalog & SKU Pricing
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Unit Price</th>
                <th className="p-3">Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-mono text-indigo-400 font-semibold">{p.sku}</td>
                  <td className="p-3 font-bold text-white">{p.name}</td>
                  <td className="p-3 text-slate-300">{p.category}</td>
                  <td className="p-3 font-bold text-emerald-400">₹{p.unitPrice?.toLocaleString()}</td>
                  <td className="p-3 text-slate-400">₹{p.cost?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
