import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import { 
  BarChart3, 
  Users, 
  Package, 
  Warehouse as WarehouseIcon, 
  Percent, 
  Sliders, 
  Shield, 
  Save, 
  Plus, 
  UserPlus, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Repeat, 
  Tag, 
  Layers,
  Award,
  Clock,
  MessageSquare,
  RotateCcw,
  FileCheck2,
  PackageCheck,
  UserCheck,
  Search,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'analytics'); // analytics | requests_history | users | products | pricelists | governance

  const [config, setConfig] = useState({ discountTiers: [], categoryLimits: [] });
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [requestsHistory, setRequestsHistory] = useState([]);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
  const [selectedRequestAudit, setSelectedRequestAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editable form states for Governance
  const [tierLimits, setTierLimits] = useState({ Bronze: 5, Silver: 10, Gold: 15 });
  const [categoryLimits, setCategoryLimits] = useState({ Hardware: 15, Services: 10, Software: 20 });
  const [savingConfig, setSavingConfig] = useState(false);

  // Modals state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_REP',
    salesManagerId: '',
    company: ''
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    category: 'Hardware',
    unitPrice: '',
    cost: '',
    description: '',
    type: 'ONE_TIME',
    billingFrequency: 'NONE'
  });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  const [isAddPriceListModalOpen, setIsAddPriceListModalOpen] = useState(false);
  const [newPriceListForm, setNewPriceListForm] = useState({
    name: '',
    product: '',
    customerTier: 'Bronze',
    salesPrice: ''
  });
  const [submittingPriceList, setSubmittingPriceList] = useState(false);

  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: '',
    code: '',
    location: '',
    capacity: 10000
  });
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false);

  const [isAddSubPlanModalOpen, setIsAddSubPlanModalOpen] = useState(false);
  const [newSubPlanForm, setNewSubPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    billingFrequency: 'Monthly',
    durationMonths: 12,
    status: 'Active'
  });
  const [submittingSubPlan, setSubmittingSubPlan] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [cfgRes, prodRes, plRes, whRes, spRes, userRes, custRes, analyticsRes, reqsRes] = await Promise.all([
        API.get('/admin/config').catch(() => ({ data: { discountTiers: [], categoryLimits: [] } })),
        API.get('/admin/products').catch(() => ({ data: [] })),
        API.get('/admin/pricelists').catch(() => ({ data: [] })),
        API.get('/admin/warehouses').catch(() => ({ data: [] })),
        API.get('/admin/subscription-plans').catch(() => ({ data: [] })),
        API.get('/admin/users').catch(() => ({ data: [] })),
        API.get('/admin/customers').catch(() => ({ data: [] })),
        API.get('/admin/analytics').catch(() => ({ data: null })),
        API.get('/customer-requests').catch(() => ({ data: [] }))
      ]);

      setConfig(cfgRes.data);
      setProducts(prodRes.data || []);
      setPriceLists(plRes.data || []);
      setWarehouses(whRes.data || []);
      setSubscriptionPlans(spRes.data || []);
      setUsers(userRes.data || []);
      setCustomers(custRes.data || []);
      setAnalytics(analyticsRes.data || null);
      setRequestsHistory(reqsRes.data || []);

      if (prodRes.data && prodRes.data.length > 0) {
        setNewPriceListForm(prev => ({ ...prev, product: prodRes.data[0]._id }));
      }

      // Populate governance limits
      const tMap = {};
      (cfgRes.data.discountTiers || []).forEach(t => { tMap[t.tier] = t.maxDiscountPercentage; });
      if (Object.keys(tMap).length) setTierLimits(prev => ({ ...prev, ...tMap }));

      const cMap = {};
      (cfgRes.data.categoryLimits || []).forEach(c => { cMap[c.category] = c.maxDiscountPercentage; });
      if (Object.keys(cMap).length) setCategoryLimits(prev => ({ ...prev, ...cMap }));

    } catch (err) {
      toast.error('Failed to load system administration data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error('Please enter name, email, and password');
      return;
    }
    setSubmittingUser(true);

    try {
      await API.post('/admin/users', newUserForm);
      toast.success(`User account created successfully for ${newUserForm.email}!`);
      setIsAddUserModalOpen(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'SALES_REP', salesManagerId: '', company: '' });
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user account');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProductForm.name || !newProductForm.sku || !newProductForm.unitPrice) {
      toast.error('Please enter product name, SKU, and unit price');
      return;
    }
    setSubmittingProduct(true);

    try {
      await API.post('/admin/products', {
        ...newProductForm,
        unitPrice: Number(newProductForm.unitPrice),
        cost: Number(newProductForm.cost) || 0
      });
      toast.success('Product/Subscription Plan created successfully!');
      setIsAddProductModalOpen(false);
      setNewProductForm({
        name: '',
        sku: '',
        category: 'Hardware',
        unitPrice: '',
        cost: '',
        description: '',
        type: 'ONE_TIME',
        billingFrequency: 'NONE'
      });
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleCreatePriceList = async (e) => {
    e.preventDefault();
    if (!newPriceListForm.product || !newPriceListForm.salesPrice) {
      toast.error('Please select product and enter tier sales price');
      return;
    }
    setSubmittingPriceList(true);

    try {
      await API.post('/admin/pricelists', {
        ...newPriceListForm,
        salesPrice: Number(newPriceListForm.salesPrice)
      });
      toast.success('Tier Price List saved successfully!');
      setIsAddPriceListModalOpen(false);
      setNewPriceListForm({ name: '', product: products.length ? products[0]._id : '', customerTier: 'Bronze', salesPrice: '' });
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save price list');
    } finally {
      setSubmittingPriceList(false);
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    if (!newWarehouseForm.name || !newWarehouseForm.code || !newWarehouseForm.location) {
      toast.error('Please enter warehouse name, code, and location');
      return;
    }
    setSubmittingWarehouse(true);

    try {
      await API.post('/admin/warehouses', newWarehouseForm);
      toast.success('Warehouse created successfully!');
      setIsAddWarehouseModalOpen(false);
      setNewWarehouseForm({ name: '', code: '', location: '', capacity: 10000 });
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setSubmittingWarehouse(false);
    }
  };

  const handleCreateSubscriptionPlan = async (e) => {
    e.preventDefault();
    if (!newSubPlanForm.name || !newSubPlanForm.price) {
      toast.error('Please enter plan name and price');
      return;
    }
    setSubmittingSubPlan(true);

    try {
      await API.post('/admin/subscription-plans', {
        ...newSubPlanForm,
        price: Number(newSubPlanForm.price),
        durationMonths: Number(newSubPlanForm.durationMonths) || 12
      });
      toast.success('Subscription plan created successfully!');
      setIsAddSubPlanModalOpen(false);
      setNewSubPlanForm({ name: '', description: '', price: '', billingFrequency: 'Monthly', durationMonths: 12, status: 'Active' });
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subscription plan');
    } finally {
      setSubmittingSubPlan(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      for (const [tier, val] of Object.entries(tierLimits)) {
        await API.put('/admin/discount-tier', { tier, maxDiscountPercentage: Number(val) });
      }
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

  const managersList = users.filter(u => u.role === 'SALES_MANAGER');
  const repsList = users.filter(u => u.role === 'SALES_REP');
  const kpis = analytics?.kpis || {};

  const filteredRequestsHistory = requestsHistory.filter(req => {
    const q = requestSearchQuery.toLowerCase().trim();
    const reqNum = (req.requestNumber || '').toLowerCase();
    const custName = (req.customer?.name || '').toLowerCase();
    const custComp = (req.customer?.company || '').toLowerCase();
    const repName = (req.assignedSalesRep?.name || '').toLowerCase();

    const matchesQuery = !q || reqNum.includes(q) || custName.includes(q) || custComp.includes(q) || repName.includes(q);
    const matchesStatus = requestStatusFilter === 'ALL' || req.status === requestStatusFilter || (requestStatusFilter === 'Rejected' && req.status.toLowerCase().includes('reject'));

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-card to-emerald-500/20 p-6 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30">
              System Administration
            </span>
            <span className="text-xs font-semibold text-muted-foreground">Read-Only Workflow Monitoring Mode Active</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-1.5 font-sans">Platform Governance & Analytics</h1>
          <p className="text-xs text-muted-foreground font-medium">Create users, assign Sales Managers to Sales Reps, assign Sales Reps to Customers, manage catalog/prices/plans, and monitor team performance</p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-4 h-4" /> + Create Manager / Rep / Customer
          </button>
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> + Add Product / Plan
          </button>
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'analytics' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Platform Analytics & Work Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('requests_history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'requests_history' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Request & Platform History</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{requestsHistory.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'users' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management & Assignments</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{users.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'products' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products & Subscriptions</span>
        </button>

        <button
          onClick={() => setActiveTab('pricelists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'pricelists' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Price Lists & Warehouses</span>
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'governance' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Discount Tiers Governance</span>
        </button>
      </div>

      {/* TAB 1: PLATFORM ANALYTICS & TEAM WORKFLOW TRACKER */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Overall Platform Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Platform Revenue" value={`₹${kpis.totalPlatformRevenue?.toLocaleString() || 0}`} subtitle="Won deals & invoices" icon={DollarSign} color="emerald" />
            <KPICard title="Total Requests" value={kpis.totalRequests || 0} subtitle="Submitted requests" icon={TrendingUp} color="indigo" />
            <KPICard title="Total Quotations" value={kpis.totalQuotations || 0} subtitle="Official proposals" icon={BarChart3} color="cyan" />
            <KPICard title="Closed / Won Deals" value={kpis.totalClosedDeals || 0} subtitle="Finalized contracts" icon={CheckCircle2} color="emerald" />

            <KPICard title="Pending Approvals" value={kpis.pendingApprovals || 0} subtitle="Manager queue" icon={Clock} color="amber" />
            <KPICard title="Active Negotiations" value={kpis.activeNegotiations || 0} subtitle="Discount discussions" icon={MessageSquare} color="indigo" />
            <KPICard title="Rejected Deals" value={kpis.rejectedDeals || 0} subtitle="Denied requests" icon={XCircle} color="rose" />
            <KPICard title="Withdrawn / Stopped" value={(kpis.withdrawnDeals || 0) + (kpis.stoppedDeals || 0)} subtitle="Cancelled by customer" icon={RotateCcw} color="slate" />

            <KPICard title="Active Subscriptions" value={kpis.activeSubscriptions || 0} subtitle="Recurring services" icon={Repeat} color="emerald" />
            <KPICard title="Unpaid Invoices" value={kpis.unpaidInvoices || 0} subtitle="Outstanding billing" icon={FileCheck2} color="rose" />
            <KPICard title="Delivered Fulfillments" value={kpis.fulfillmentCount || 0} subtitle="Logistics dispatched" icon={PackageCheck} color="cyan" />
            <KPICard title="Pending Backorders" value={kpis.backorderCount || 0} subtitle="Stock replenishment" icon={WarehouseIcon} color="amber" />
          </div>

          {/* PERFORMANCE BY SALES REPRESENTATIVE */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Performance By Sales Representative (Read-Only Activity Tracker)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time breakdown of requests received, handled, active negotiations, quotations, closed deals, avg deal value, and revenue per Rep</p>
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading sales rep performance metrics...</p>
            ) : !analytics?.repPerformance || analytics.repPerformance.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No sales representative performance data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Sales Rep</th>
                      <th className="p-3.5">Assigned Manager</th>
                      <th className="p-3.5">Requests Received</th>
                      <th className="p-3.5">Requests Handled</th>
                      <th className="p-3.5">Active Negotiations</th>
                      <th className="p-3.5">Quotations</th>
                      <th className="p-3.5">Deals Won</th>
                      <th className="p-3.5">Deals Rejected</th>
                      <th className="p-3.5">Avg Deal Value</th>
                      <th className="p-3.5">Conversion Rate</th>
                      <th className="p-3.5 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {analytics.repPerformance.map((rep) => (
                      <tr key={rep._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5">
                          <p className="font-extrabold text-foreground">{rep.name}</p>
                          <p className="text-[10px] text-muted-foreground">{rep.email}</p>
                        </td>
                        <td className="p-3.5 font-semibold text-muted-foreground">{rep.managerName}</td>
                        <td className="p-3.5 font-bold text-foreground">{rep.totalRequests}</td>
                        <td className="p-3.5 font-bold text-indigo-400">{rep.requestsHandled}</td>
                        <td className="p-3.5 font-bold text-amber-500">{rep.activeNegotiations}</td>
                        <td className="p-3.5 font-bold text-cyan-400">{rep.quotationsCreated}</td>
                        <td className="p-3.5 font-bold text-emerald-500">{rep.dealsWon}</td>
                        <td className="p-3.5 font-bold text-rose-500">{rep.dealsRejected}</td>
                        <td className="p-3.5 font-semibold text-foreground">₹{rep.averageDealValue?.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/30">
                            {rep.conversionRate}%
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-extrabold text-emerald-500">
                          ₹{rep.totalRevenue?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PERFORMANCE BY SALES MANAGER */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Performance By Sales Manager (Read-Only Activity Tracker)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Metrics detailing manager review volume, escalations handled, approval rates, negotiations requested, and total team revenue</p>
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading manager performance metrics...</p>
            ) : !analytics?.managerPerformance || analytics.managerPerformance.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No sales manager performance data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Sales Manager</th>
                      <th className="p-3.5">Team Size (Reps)</th>
                      <th className="p-3.5">Escalations Reviewed</th>
                      <th className="p-3.5">Approvals Granted</th>
                      <th className="p-3.5">Rejections</th>
                      <th className="p-3.5">Negotiations Requested</th>
                      <th className="p-3.5">Approval Rate</th>
                      <th className="p-3.5">Team Deals Won</th>
                      <th className="p-3.5 text-right">Team Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {analytics.managerPerformance.map((mgr) => (
                      <tr key={mgr._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5">
                          <p className="font-extrabold text-foreground">{mgr.name}</p>
                          <p className="text-[10px] text-muted-foreground">{mgr.email}</p>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">{mgr.teamSize} Reps</td>
                        <td className="p-3.5 font-bold text-indigo-400">{mgr.escalationsReceived}</td>
                        <td className="p-3.5 font-bold text-emerald-500">{mgr.approvalsGranted}</td>
                        <td className="p-3.5 font-bold text-rose-500">{mgr.rejections}</td>
                        <td className="p-3.5 font-bold text-amber-500">{mgr.negotiationsRequested}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            {mgr.approvalRate}%
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-500">{mgr.dealsClosed}</td>
                        <td className="p-3.5 text-right font-extrabold text-emerald-500">
                          ₹{mgr.teamRevenue?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: PLATFORM CUSTOMER REQUESTS & WORKFLOW HISTORY (READ-ONLY AUDIT TRAIL) */}
      {activeTab === 'requests_history' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-400" />
                  Platform Customer Requests & Workflow History (Read-Only Audit Trail)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete history of all customer product requests, requested items, discounts, risk levels, and status progressions across the platform.
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    placeholder="Search PR#, Customer, Rep..."
                    className="bg-input border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none w-48 sm:w-64"
                  />
                </div>

                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="bg-input border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-bold focus:border-primary focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved_Rep">Approved by Rep</option>
                  <option value="Escalated_Manager">Escalated to Manager</option>
                  <option value="WAITING_FOR_FINANCE">Waiting for Finance</option>
                  <option value="Approved_Manager">Approved by Manager</option>
                  <option value="Closed">Closed Deal</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                  <option value="STOPPED">Stopped</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            {filteredRequestsHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No customer request history records found matching criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Request #</th>
                      <th className="p-3.5">Customer Account</th>
                      <th className="p-3.5">Assigned Sales Rep</th>
                      <th className="p-3.5">Requested Items</th>
                      <th className="p-3.5">Risk Assessment</th>
                      <th className="p-3.5">Current Status</th>
                      <th className="p-3.5">Date Submitted</th>
                      <th className="p-3.5 text-right">Audit History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {filteredRequestsHistory.map((req) => (
                      <tr key={req._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-extrabold text-primary font-mono">{req.requestNumber}</td>
                        <td className="p-3.5">
                          <p className="font-extrabold text-foreground">{req.customer?.company || req.customer?.name || 'Customer'}</p>
                          <p className="text-[10px] text-muted-foreground">{req.customer?.email}</p>
                        </td>
                        <td className="p-3.5 font-semibold text-muted-foreground">{req.assignedSalesRep?.name || 'Unassigned'}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{req.items?.length || 0} Items</p>
                        </td>
                        <td className="p-3.5">
                          <RiskBadge level={req.riskLevel} score={req.riskScore} />
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedRequestAudit(req)}
                            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs transition flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Audit History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & STRICT ASSIGNMENTS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* User Creation Header & User Role List */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Admin User Creation & System Accounts
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Create Sales Managers, Sales Representatives, and Customer accounts</p>
              </div>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create New User Account</span>
              </button>
            </div>

            {/* Sales Rep -> Sales Manager Assignment Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                Sales Representatives &rarr; Sales Manager Hierarchy (Assign Sales Manager Only)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Sales Representative</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Current Role</th>
                      <th className="p-3.5">Assigned Sales Manager (Manager Only)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {users.filter(u => u.role === 'SALES_REP').map((rep) => (
                      <tr key={rep._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-extrabold text-foreground">{rep.name}</td>
                        <td className="p-3.5 font-mono text-muted-foreground">{rep.email}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 uppercase">
                            SALES_REP
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={rep.salesManagerId?._id || rep.salesManagerId || ''}
                            onChange={async (e) => {
                              const mgrId = e.target.value;
                              try {
                                await API.put(`/admin/users/${rep._id}`, { salesManagerId: mgrId || null });
                                toast.success(`Assigned Sales Manager to ${rep.name}`);
                                fetchAdminData();
                              } catch (err) {
                                toast.error('Failed to assign sales manager');
                              }
                            }}
                            className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-bold focus:border-primary focus:outline-none"
                          >
                            <option value="">-- Assign Sales Manager --</option>
                            {managersList.map(m => (
                              <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Accounts -> Sales Representative Assignment Section */}
            <div className="pt-6 border-t border-border space-y-3">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                Customer Accounts &rarr; Sales Representative Hierarchy (Assign Sales Rep Only)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Customer Name / Company</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Tier</th>
                      <th className="p-3.5">Assigned Sales Representative (Rep Only)</th>
                      <th className="p-3.5">Auto-Linked Sales Manager</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {customers.map((c) => (
                      <tr key={c._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-extrabold text-foreground">{c.company || c.name}</td>
                        <td className="p-3.5 font-mono text-muted-foreground">{c.email}</td>
                        <td className="p-3.5 font-bold text-amber-500">{c.tier || 'Bronze'}</td>
                        <td className="p-3.5">
                          <select
                            value={c.assignedSalesRepresentative?._id || c.assignedSalesRepresentative || ''}
                            onChange={async (e) => {
                              const repId = e.target.value;
                              try {
                                await API.put(`/admin/customers/${c._id}/assign-rep`, { assignedSalesRepresentative: repId || null });
                                toast.success(`Assigned Sales Rep to ${c.name || c.company}`);
                                fetchAdminData();
                              } catch (err) {
                                toast.error('Failed to assign sales representative');
                              }
                            }}
                            className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-bold focus:border-primary focus:outline-none"
                          >
                            <option value="">-- Assign Sales Representative --</option>
                            {repsList.map(r => (
                              <option key={r._id} value={r._id}>{r.name} ({r.email})</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5 font-semibold text-muted-foreground">
                          {c.assignedSalesManager?.name || 'Linked via Rep'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: PRODUCTS & SUBSCRIPTION PLANS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Products Section */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" />
                  Product Catalog
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage product names, categories, pricing, and product types (one-time or recurring)</p>
              </div>

              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Product</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Product Type</th>
                    <th className="p-3.5">Unit Price</th>
                    <th className="p-3.5">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-mono text-primary font-bold">{p.sku}</td>
                      <td className="p-3.5 font-extrabold text-foreground">{p.name}</td>
                      <td className="p-3.5 font-semibold text-muted-foreground">{p.category}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.type === 'RECURRING' || p.category === 'Services' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-primary/10 text-primary border border-primary/30'
                        }`}>
                          {p.type || 'ONE_TIME'} {p.billingFrequency && p.billingFrequency !== 'NONE' ? `(${p.billingFrequency})` : ''}
                        </span>
                      </td>
                      <td className="p-3.5 font-extrabold text-emerald-500">₹{p.unitPrice?.toLocaleString()}</td>
                      <td className="p-3.5 text-muted-foreground font-medium">₹{p.cost?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subscription Plans Section */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-amber-500" />
                  Subscription Plans
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configure recurring subscription plans, prices, billing frequencies, and durations</p>
              </div>

              <button
                onClick={() => setIsAddSubPlanModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Subscription Plan</span>
              </button>
            </div>

            {subscriptionPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No subscription plans created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Plan Name</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5">Billing Frequency</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {subscriptionPlans.map((sp) => (
                      <tr key={sp._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-extrabold text-foreground">{sp.name}</td>
                        <td className="p-3.5 text-muted-foreground">{sp.description || 'N/A'}</td>
                        <td className="p-3.5 font-extrabold text-emerald-500">₹{sp.price?.toLocaleString()}</td>
                        <td className="p-3.5 font-bold text-indigo-400">{sp.billingFrequency}</td>
                        <td className="p-3.5 font-semibold text-muted-foreground">{sp.durationMonths} Months</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sp.status === 'Active' ? 'bg-success/10 text-success border border-success/30' : 'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {sp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PRICE LISTS & WAREHOUSES */}
      {activeTab === 'pricelists' && (
        <div className="space-y-6">
          {/* Custom Tier Price Lists */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  Tier-Based Custom Price Lists
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configure named price lists with tier applicability (Bronze, Silver, Gold)</p>
              </div>

              <button
                onClick={() => setIsAddPriceListModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> + Set Tier Price List
              </button>
            </div>

            {priceLists.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No custom tier price lists created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Price List Name</th>
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Customer Tier Applicability</th>
                      <th className="p-3.5">Custom Price</th>
                      <th className="p-3.5">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {priceLists.map((pl) => (
                      <tr key={pl._id} className="hover:bg-muted/50 transition">
                        <td className="p-3.5 font-bold text-foreground">{pl.name || 'Standard Price List'}</td>
                        <td className="p-3.5 font-semibold text-primary">{pl.product?.name || 'Product'}</td>
                        <td className="p-3.5 font-bold text-amber-500">{pl.customerTier}</td>
                        <td className="p-3.5 font-extrabold text-emerald-500">₹{pl.salesPrice?.toLocaleString()}</td>
                        <td className="p-3.5 text-muted-foreground font-medium">{new Date(pl.effectiveDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Warehouses Section */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <WarehouseIcon className="w-4 h-4 text-cyan-400" />
                  Logistics & Warehouses
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Physical fulfillment centers and stock distribution hubs</p>
              </div>

              <button
                onClick={() => setIsAddWarehouseModalOpen(true)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> + Add Warehouse
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Warehouse Name</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5 text-right">Available Stock Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {warehouses.map((w) => (
                    <tr key={w._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-mono text-cyan-400 font-bold">{w.code || 'WH-MAIN'}</td>
                      <td className="p-3.5 font-bold text-foreground">{w.name}</td>
                      <td className="p-3.5 text-muted-foreground">{w.location}</td>
                      <td className="p-3.5 text-right font-extrabold text-foreground">{w.capacity?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DISCOUNT TIERS GOVERNANCE */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Customer Discount Tiers */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4 border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  Customer Tier Discount Governance (Max %)
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { tier: 'Bronze', label: 'Bronze Tier (5% Default)' },
                  { tier: 'Silver', label: 'Silver Tier (10% Baseline)' },
                  { tier: 'Gold', label: 'Gold Tier (15% Baseline)' }
                ].map((t) => (
                  <div key={t.tier} className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-500">{t.label}</span>
                      <p className="text-[11px] text-muted-foreground">Configured max discount %</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tierLimits[t.tier] !== undefined ? tierLimits[t.tier] : (t.tier === 'Bronze' ? 5 : (t.tier === 'Silver' ? 10 : 15))}
                        onChange={(e) => setTierLimits({ ...tierLimits, [t.tier]: Number(e.target.value) })}
                        className="w-20 bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-amber-500 font-extrabold text-center focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Discount Limits */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4 border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Category Maximum Discount Ceiling Policy (Max %)
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { category: 'Hardware' },
                  { category: 'Services' },
                  { category: 'Software' }
                ].map((c) => (
                  <div key={c.category} className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">{c.category} Category Ceiling</span>
                      <p className="text-[11px] text-muted-foreground">Maximum allowed category discount</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={categoryLimits[c.category] !== undefined ? categoryLimits[c.category] : 15}
                        onChange={(e) => setCategoryLimits({ ...categoryLimits, [c.category]: Number(e.target.value) })}
                        className="w-20 bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-indigo-400 font-extrabold text-center focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground font-bold">%</span>
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
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Saving Policy Changes...' : 'Save Discount Governance Rules'}
            </button>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Create New User Account
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Sales Manager Sarah"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="e.g. manager.sarah@dealflow360.com"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Set initial login password"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                >
                  <option value="SALES_REP">Sales Representative (SALES_REP)</option>
                  <option value="SALES_MANAGER">Sales Manager (SALES_MANAGER)</option>
                  <option value="CUSTOMER">Customer (CUSTOMER - Default Bronze Tier)</option>
                  <option value="FINANCE_OPERATIONS">Finance & Operations (FINANCE_OPERATIONS)</option>
                  <option value="ADMIN">Administrator (ADMIN)</option>
                </select>
              </div>

              {newUserForm.role === 'CUSTOMER' && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.company}
                    onChange={(e) => setNewUserForm({ ...newUserForm, company: e.target.value })}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {newUserForm.role === 'SALES_REP' && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Assign Sales Manager</label>
                  <select
                    value={newUserForm.salesManagerId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, salesManagerId: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Select Sales Manager --</option>
                    {managersList.map(m => (
                      <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submittingUser ? 'Creating User...' : 'Create User Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW PRODUCT MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" />
                Add Product
              </h3>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Server Workstation"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                    placeholder="e.g. SK-1099"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Category</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Product Type</label>
                  <select
                    value={newProductForm.type}
                    onChange={(e) => setNewProductForm({ ...newProductForm, type: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="ONE_TIME">One-Time Sale</option>
                    <option value="RECURRING">Recurring Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Billing Frequency</label>
                  <select
                    value={newProductForm.billingFrequency}
                    onChange={(e) => setNewProductForm({ ...newProductForm, billingFrequency: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="NONE">NONE (One-Time)</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="ANNUALLY">ANNUALLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProductForm.unitPrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unitPrice: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductForm.cost}
                    onChange={(e) => setNewProductForm({ ...newProductForm, cost: e.target.value })}
                    placeholder="e.g. 8000"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submittingProduct ? 'Saving...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW SUBSCRIPTION PLAN MODAL */}
      {isAddSubPlanModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-500" />
                Add Subscription Plan
              </h3>
              <button
                onClick={() => setIsAddSubPlanModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubscriptionPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={newSubPlanForm.name}
                  onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, name: e.target.value })}
                  placeholder="e.g. Cloud Support Pro Plan"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Plan Description</label>
                <textarea
                  rows="2"
                  value={newSubPlanForm.description}
                  onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, description: e.target.value })}
                  placeholder="e.g. 24/7 dedicated engineering support & maintenance"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newSubPlanForm.price}
                    onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, price: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Billing Frequency</label>
                  <select
                    value={newSubPlanForm.billingFrequency}
                    onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, billingFrequency: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSubPlanForm.durationMonths}
                    onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, durationMonths: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Status</label>
                  <select
                    value={newSubPlanForm.status}
                    onChange={(e) => setNewSubPlanForm({ ...newSubPlanForm, status: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddSubPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSubPlan}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submittingSubPlan ? 'Saving...' : 'Save Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRICE LIST MODAL */}
      {isAddPriceListModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-500" />
                Set Tier Price List
              </h3>
              <button
                onClick={() => setIsAddPriceListModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePriceList} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Price List Name</label>
                <input
                  type="text"
                  required
                  value={newPriceListForm.name}
                  onChange={(e) => setNewPriceListForm({ ...newPriceListForm, name: e.target.value })}
                  placeholder="e.g. Bronze Tier Baseline Price List"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select Product</label>
                <select
                  value={newPriceListForm.product}
                  onChange={(e) => setNewPriceListForm({ ...newPriceListForm, product: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Standard ₹{p.unitPrice?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Target Customer Tier Applicability</label>
                <select
                  value={newPriceListForm.customerTier}
                  onChange={(e) => setNewPriceListForm({ ...newPriceListForm, customerTier: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold text-amber-500"
                >
                  <option value="Bronze">Bronze Tier</option>
                  <option value="Silver">Silver Tier</option>
                  <option value="Gold">Gold Tier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Special Tier Sales Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newPriceListForm.salesPrice}
                  onChange={(e) => setNewPriceListForm({ ...newPriceListForm, salesPrice: e.target.value })}
                  placeholder="e.g. 12500"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddPriceListModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPriceList}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{submittingPriceList ? 'Saving...' : 'Save Price List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WAREHOUSE MODAL */}
      {isAddWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-cyan-400" />
                Add Warehouse / Fulfillment Center
              </h3>
              <button
                onClick={() => setIsAddWarehouseModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Warehouse Name</label>
                <input
                  type="text"
                  required
                  value={newWarehouseForm.name}
                  onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, name: e.target.value })}
                  placeholder="e.g. Mumbai Main Hub"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Warehouse Code</label>
                  <input
                    type="text"
                    required
                    value={newWarehouseForm.code}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, code: e.target.value })}
                    placeholder="e.g. WH-BOM-01"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Available Stock Units</label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={newWarehouseForm.capacity}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, capacity: Number(e.target.value) })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Location / Address</label>
                <input
                  type="text"
                  required
                  value={newWarehouseForm.location}
                  onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, location: e.target.value })}
                  placeholder="e.g. Bhiwandi Industrial Zone, Mumbai"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWarehouse}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <WarehouseIcon className="w-3.5 h-3.5" />
                  <span>{submittingWarehouse ? 'Saving...' : 'Save Warehouse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY CUSTOMER REQUEST AUDIT HISTORY MODAL */}
      {selectedRequestAudit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                    🔒 Read-Only Platform Audit Log
                  </span>
                  <StatusBadge status={selectedRequestAudit.status} />
                </div>
                <h3 className="text-lg font-extrabold text-foreground mt-1">
                  Customer Request History: {selectedRequestAudit.requestNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequestAudit(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {/* Customer & Rep Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Customer Account</p>
                <p className="text-sm font-extrabold text-foreground">{selectedRequestAudit.customer?.company || selectedRequestAudit.customer?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedRequestAudit.customer?.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Sales Representative</p>
                <p className="text-sm font-extrabold text-foreground">{selectedRequestAudit.assignedSalesRep?.name || 'Unassigned'}</p>
                <p className="text-xs text-muted-foreground">{selectedRequestAudit.assignedSalesRep?.email}</p>
              </div>
            </div>

            {/* Items Requested */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Requested Products & Discount Proposals</h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5 text-right">Desired Discount %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {selectedRequestAudit.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-foreground">{item.product?.name || 'Product'}</td>
                        <td className="p-2.5 font-semibold text-muted-foreground">{item.quantity}</td>
                        <td className="p-2.5 text-right font-extrabold text-amber-500">{item.desiredDiscountPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Risk Score & Assessment (Score: {selectedRequestAudit.riskScore}/100)</p>
                <RiskBadge level={selectedRequestAudit.riskLevel} score={selectedRequestAudit.riskScore} />
              </div>
              {selectedRequestAudit.riskReasons?.length > 0 && (
                <ul className="list-disc list-inside text-xs text-foreground space-y-1 pl-1">
                  {selectedRequestAudit.riskReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground">
                Read-Only Audit Mode: No review or decision options available for Admin.
              </p>
              <button
                onClick={() => setSelectedRequestAudit(null)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition font-bold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
