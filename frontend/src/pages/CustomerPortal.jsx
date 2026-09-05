import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import KPICard from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import NegotiationDrawer from '../components/NegotiationDrawer';
import { 
  LayoutDashboard,
  ShoppingCart,
  FileText, 
  MessageSquare, 
  CreditCard,
  Send,
  UserCheck,
  FileCheck2, 
  Repeat, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  PackageCheck,
  Building2,
  Plus,
  Trash2,
  Eye,
  X,
  XCircle,
  ShieldCheck,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const CustomerPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [negotiationCorner, setNegotiationCorner] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [activeNegotiationId, setActiveNegotiationId] = useState(null);
  
  // Modals state
  const [selectedQuotationView, setSelectedQuotationView] = useState(null);
  const [acceptModalQuote, setAcceptModalQuote] = useState(null);
  const [rejectModalQuote, setRejectModalQuote] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [openNegModalQuote, setOpenNegModalQuote] = useState(null);
  const [openNegDiscount, setOpenNegDiscount] = useState('');
  const [openNegMessage, setOpenNegMessage] = useState('');

  const [reopenModalQuote, setReopenModalQuote] = useState(null);
  const [newProposedDiscount, setNewProposedDiscount] = useState('');
  const [reopenMessage, setReopenMessage] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);

  // New Product Request Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestItems, setRequestItems] = useState([
    { product: '', quantity: 1, desiredDiscountPercent: 0 }
  ]);
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [billingSubTab, setBillingSubTab] = useState('subscriptions'); // 'subscriptions' | 'products'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const { data } = await API.get('/admin/products');
      setProductsCatalog(data || []);
      if (data && data.length > 0) {
        setRequestItems([{ product: data[0]._id, quantity: 1, desiredDiscountPercent: 0 }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [reqRes, qRes, invRes, subRes, repRes, negRes, msgRes] = await Promise.all([
        API.get('/customer-requests').catch(() => ({ data: [] })),
        API.get('/quotations').catch(() => ({ data: [] })),
        API.get('/invoices').catch(() => ({ data: [] })),
        API.get('/subscriptions').catch(() => ({ data: [] })),
        API.get('/assignments/my-rep').catch(() => ({ data: null })),
        API.get('/negotiations/customer-corner').catch(() => ({ data: [] })),
        API.get('/messages').catch(() => ({ data: { assignedRep: null, messages: [] } }))
      ]);

      setCustomerRequests(reqRes.data || []);
      setQuotations(qRes.data || []);
      setInvoices(invRes.data || []);
      setSubscriptions(subRes.data || []);
      setCustomerInfo(repRes.data || null);
      setNegotiationCorner(negRes.data || []);
      setChatMessages(msgRes.data?.messages || []);
    } catch (err) {
      toast.error('Failed to load customer portal data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const firstProdId = productsCatalog.length > 0 ? productsCatalog[0]._id : '';
    setRequestItems([...requestItems, { product: firstProdId, quantity: 1, desiredDiscountPercent: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (requestItems.length === 1) return;
    const updated = requestItems.filter((_, idx) => idx !== index);
    setRequestItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...requestItems];
    updated[index][field] = value;
    setRequestItems(updated);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requestItems || requestItems.length === 0) {
      toast.error('Please add at least one product to request');
      return;
    }
    setSubmittingRequest(true);

    try {
      await API.post('/customer-requests', {
        items: requestItems,
        message: requestMessage
      });

      toast.success('Product request sent successfully! Automatically assigned to your Sales Representative.');
      setIsRequestModalOpen(false);
      setRequestMessage('');
      fetchCustomerData();
      setActiveTab('requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit product request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleConfirmAcceptQuotation = async () => {
    if (!acceptModalQuote) return;
    try {
      await API.post(`/quotations/${acceptModalQuote._id}/accept`);
      toast.success(`Quotation ${acceptModalQuote.quoteNumber} accepted successfully!`);
      setAcceptModalQuote(null);
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept quotation');
    }
  };

  const handleConfirmRejectQuotation = async () => {
    if (!rejectModalQuote) return;
    try {
      await API.post(`/quotations/${rejectModalQuote._id}/reject`, {
        rejectionReason
      });
      toast.info(`Quotation ${rejectModalQuote.quoteNumber} rejected.`);
      setRejectModalQuote(null);
      setRejectionReason('');
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation');
    }
  };

  const handleOpenQuotationNegotiation = async (quotationId) => {
    try {
      const { data } = await API.get(`/negotiations/quotation/${quotationId}`);
      if (data && data._id) {
        setActiveNegotiationId(data._id);
      }
    } catch (err) {
      toast.error('Failed to open quotation negotiation thread');
    }
  };

  const handleOpenNegotiationSubmit = async (e) => {
    e.preventDefault();
    if (!openNegModalQuote || !openNegDiscount) return;
    try {
      await API.post(`/negotiations/quotation/${openNegModalQuote._id}/message`, {
        counterDiscountPercent: Number(openNegDiscount),
        message: openNegMessage || 'Customer initiated discount negotiation'
      });
      toast.success('Negotiation proposal sent to your Sales Representative!');
      setOpenNegModalQuote(null);
      setOpenNegDiscount('');
      setOpenNegMessage('');
      fetchCustomerData();
      setActiveTab('negotiations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open negotiation');
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!newProposedDiscount || !reopenModalQuote) return;
    setSubmittingReopen(true);

    try {
      await API.post('/negotiations/reopen', {
        quotationId: reopenModalQuote._id,
        proposedDiscountPercent: Number(newProposedDiscount),
        message: reopenMessage
      });
      toast.success('Negotiation reopened! Your new discount proposal was sent for review.');
      setReopenModalQuote(null);
      setNewProposedDiscount('');
      setReopenMessage('');
      fetchCustomerData();
      setActiveTab('negotiations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen negotiation');
    } finally {
      setSubmittingReopen(false);
    }
  };

  const handleDiscardRequest = async (requestId) => {
    try {
      await API.post(`/customer-requests/${requestId}/discard`);
      toast.info('Request discarded and moved to Discarded Records.');
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard request');
    }
  };

  const handleDiscardQuotation = async (quotationId) => {
    try {
      await API.post(`/quotations/${quotationId}/discard`);
      toast.info('Quotation discarded and moved to Discarded Records.');
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard quotation');
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSendingChat(true);

    try {
      const { data } = await API.post('/messages', { content: chatInput });
      setChatMessages([...chatMessages, data]);
      setChatInput('');
      toast.success('Message sent to Sales Representative');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  const assignedRep = customerInfo?.assignedSalesRepresentative;
  const pendingRequestsCount = customerRequests.filter(r => r.status === 'Submitted' || r.status === 'Processing').length;
  const activeNegotiationsCount = negotiationCorner.filter(n => n.status === 'Open' || n.status === 'Re-approval Required').length;
  const unpaidInvoicesCount = invoices.filter(i => i.paymentStatus !== 'Paid').length;
  const activeSubscriptionsCount = subscriptions.filter(s => s.status === 'Active' || s.status === 'Trialing').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* CUSTOMER HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-600/15 via-card to-emerald-500/15 p-6 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-success uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-success/10 border border-success/30">
              {customerInfo?.tier || 'Gold Tier'}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ID: {customerInfo?._id || 'AUTO'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-1.5">{customerInfo?.name || 'Customer Portal'}</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage product requests, review official sales quotations, and handle billing</p>
        </div>

        {/* Assigned Sales Rep Badge */}
        <div className="bg-card p-3.5 rounded-xl border border-border flex items-center gap-3 shrink-0 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center font-extrabold text-white text-sm shadow">
            {assignedRep?.name ? assignedRep.name.charAt(0) : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-foreground">{assignedRep?.name || 'Assigned Representative'}</span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Online
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">{assignedRep?.email || 'salesrep@dealflow360.com'}</p>
          </div>
        </div>
      </div>

      {/* CUSTOMER NAVIGATION TABS */}
      <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'requests' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{pendingRequestsCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'quotations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quotations</span>
          {quotations.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">{quotations.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('negotiations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'negotiations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Negotiation Corner</span>
          {activeNegotiationsCount > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold">{activeNegotiationsCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'billing' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'messages' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Messages</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('closed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'closed' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-emerald-300 hover:bg-card/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Closed Deals</span>
        </button>

        <button
          onClick={() => setActiveTab('discarded')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
            activeTab === 'discarded' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-400 hover:text-rose-300 hover:bg-card/50'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Discarded Records</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD (CLEAN OVERVIEW ONLY) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard title="Pending Requests" value={pendingRequestsCount} subtitle="Awaiting Rep Quote" icon={ShoppingCart} color="indigo" />
            <KPICard title="Quotations Received" value={quotations.length} subtitle="Official proposals" icon={FileText} color="cyan" />
            <KPICard title="Active Negotiations" value={activeNegotiationsCount} subtitle="Discount discussions" icon={MessageSquare} color="amber" />
            <KPICard title="Unpaid Invoices" value={unpaidInvoicesCount} subtitle="Product billing" icon={FileCheck2} color="rose" />
            <KPICard title="Active Subscriptions" value={activeSubscriptionsCount} subtitle="Recurring services" icon={Repeat} color="emerald" />
          </div>

          {/* Overview Section: Recent Activity & Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Latest Product Request Overview Card */}
            <div className="glass-panel p-5 rounded-2xl space-y-4 border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    Latest Product Request
                  </h3>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {customerRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No product requests submitted yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">{customerRequests[0].requestNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/30">
                        {customerRequests[0].status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Products: {customerRequests[0].items?.map(i => `${i.quantity}x ${i.product?.name || 'Product'}`).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desired Discount: <span className="font-bold text-foreground">{customerRequests[0].items?.map(i => `${i.desiredDiscountPercent}%`).join(', ')}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(customerRequests[0].createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setIsRequestModalOpen(true);
                }}
                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Submit New Product Request
              </button>
            </div>

            {/* Latest Official Quotation Overview Card */}
            <div className="glass-panel p-5 rounded-2xl space-y-4 border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Latest Quotation Received
                  </h3>
                  <button 
                    onClick={() => setActiveTab('quotations')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {quotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No official quotations received yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{quotations[0].quoteNumber}</span>
                      <StatusBadge status={quotations[0].status} />
                    </div>
                    <p className="text-sm font-extrabold text-primary">₹{quotations[0].grandTotal?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Sales Rep: <span className="font-bold text-foreground">{quotations[0].salesRep?.name || assignedRep?.name || 'Sales Representative'}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Received: {new Date(quotations[0].createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveTab('quotations')}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Review Quotations & Respond
              </button>
            </div>

          </div>

          {/* Recent Activity Timeline Overview */}
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Account Activity & Updates
            </h3>
            <div className="space-y-3">
              {customerRequests.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Submitted Product Request #{r.requestNumber}</p>
                    <p className="text-[11px] text-muted-foreground">Requested {r.items?.length} items automatically assigned to {assignedRep?.name || 'Representative'}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {quotations.slice(0, 3).map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Received Official Quotation #{q.quoteNumber}</p>
                    <p className="text-[11px] text-muted-foreground">Grand total: ₹{q.grandTotal?.toLocaleString()} — Status: {q.status}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(q.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: REQUESTS (CUSTOMER CREATES PRODUCT REQUEST ONLY) */}
      {activeTab === 'requests' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Product Requests
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Submit desired products, quantities, and target discounts for representative quoting</p>
            </div>

            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Product Request</span>
            </button>
          </div>

          {customerRequests.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-2xl border border-border space-y-3">
              <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs font-bold text-muted-foreground">No product requests submitted yet.</p>
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow"
              >
                Submit First Request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Request Ref</th>
                    <th className="p-3.5">Products Requested</th>
                    <th className="p-3.5">Desired Discount %</th>
                    <th className="p-3.5">Assigned Sales Rep</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {customerRequests.filter(r => r.status !== 'DISCARDED').map((reqItem) => (
                    <tr key={reqItem._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-bold text-primary">{reqItem.requestNumber}</td>
                      <td className="p-3.5">
                        {reqItem.items?.map((i, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-extrabold text-foreground">{i.quantity}x</span> {i.product?.name || 'Product'}
                          </div>
                        ))}
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {reqItem.items?.map(i => `${i.desiredDiscountPercent}%`).join(', ')}
                      </td>
                      <td className="p-3.5 font-semibold text-muted-foreground">
                        {reqItem.assignedSalesRep?.name || assignedRep?.name || 'Assigned Rep'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          reqItem.status === 'Quoted' ? 'bg-success/10 text-success border border-success/30' : 'bg-primary/10 text-primary border border-primary/30'
                        }`}>
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">
                        {new Date(reqItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDiscardRequest(reqItem._id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[11px] font-bold inline-flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Discard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTATIONS (VIEW & RESPOND ONLY) */}
      {activeTab === 'quotations' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Official Quotations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Quotations prepared and sent by your assigned Sales Representative. Review terms and respond.</p>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading quotations...</p>
          ) : quotations.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-2xl border border-border space-y-2">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs font-bold text-muted-foreground">No official quotations received yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Quote Number</th>
                    <th className="p-3.5">Items Summary</th>
                    <th className="p-3.5">Subtotal</th>
                    <th className="p-3.5">Grand Total</th>
                    <th className="p-3.5">Sales Rep</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {quotations.filter(q => q.status !== 'DISCARDED').map((q) => (
                    <tr key={q._id} className="hover:bg-muted/50 transition">
                      <td className="p-3.5 font-bold text-foreground">{q.quoteNumber}</td>
                      <td className="p-3.5">
                        <span className="text-xs font-semibold">{q.items?.length || 0} line item(s)</span>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">₹{q.subtotal?.toLocaleString()}</td>
                      <td className="p-3.5 font-extrabold text-primary text-sm">₹{q.grandTotal?.toLocaleString()}</td>
                      <td className="p-3.5 font-semibold text-muted-foreground">{q.salesRep?.name || assignedRep?.name || 'Sales Representative'}</td>
                      <td className="p-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {/* View Button */}
                        <button
                          onClick={() => setSelectedQuotationView(q)}
                          className="px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" /> View
                        </button>

                        {q.status !== 'Confirmed' && q.status !== 'Rejected' && (
                          <>
                            {/* Accept Quotation Button */}
                            <button
                              onClick={() => setAcceptModalQuote(q)}
                              className="px-3 py-1.5 rounded-xl bg-success hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Accept Quotation
                            </button>

                            {/* Open Negotiation Button */}
                            <button
                               onClick={() => handleOpenQuotationNegotiation(q._id)}
                               className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-sm"
                             >
                               <MessageSquare className="w-3.5 h-3.5" /> Open Negotiation
                             </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => {
                                setRejectModalQuote(q);
                                setRejectionReason('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold text-xs inline-flex items-center gap-1 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Discard Button */}
                        <button
                          onClick={() => handleDiscardQuotation(q._id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold text-xs inline-flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Discard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: NEGOTIATION CORNER */}
      {activeTab === 'negotiations' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-amber-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Customer Negotiation Corner
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage active discount discussions and counter-proposals with your assigned Sales Representative</p>
          </div>

          {/* Active & Open Negotiations */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Active Negotiation Threads</h3>

            {negotiationCorner.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border">
                <p className="text-xs font-bold text-muted-foreground">No active negotiation threads found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {negotiationCorner.map((neg) => {
                  const q = neg.quotation;
                  if (!q) return null;
                  const isRejected = q.status === 'Rejected' || neg.status === 'Rejected';

                  return (
                    <div key={neg._id} className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-amber-500/50 transition">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div>
                          <span className="text-xs font-bold text-primary">{q.quoteNumber}</span>
                          <p className="text-[11px] text-muted-foreground font-semibold">Total: ₹{q.grandTotal?.toLocaleString()}</p>
                        </div>
                        <StatusBadge status={q.status} />
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground flex items-center justify-between">
                          <span>Assigned Sales Rep:</span>
                          <span className="font-bold text-foreground">{neg.salesRep?.name || assignedRep?.name || 'Sales Representative'}</span>
                        </p>
                        {neg.currentRequestedDiscount > 0 && (
                          <p className="text-muted-foreground flex items-center justify-between">
                            <span>Your Counter Discount:</span>
                            <span className="font-bold text-amber-500">{neg.currentRequestedDiscount}%</span>
                          </p>
                        )}
                        {neg.rejectionReason && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px]">
                            <p className="font-bold">Rejection Reason:</p>
                            <p>{neg.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setActiveNegotiationId(neg._id || q._id)}
                          className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary" /> Open Negotiation Thread
                        </button>

                        {isRejected && (
                          <button
                            onClick={() => setReopenModalQuote(q)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reopen Negotiation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BILLING (SUB-TABS FOR SUBSCRIPTIONS VS PRODUCTS) */}
      {activeTab === 'billing' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Billing & Invoices
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Separated into Recurring Subscriptions and One-time Hardware/Product Billing</p>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setBillingSubTab('subscriptions')}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-2 ${
                  billingSubTab === 'subscriptions' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat className="w-4 h-4 text-emerald-500" />
                <span>Subscriptions ({subscriptions.length})</span>
              </button>

              <button
                onClick={() => setBillingSubTab('products')}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-2 ${
                  billingSubTab === 'products' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-amber-500" />
                <span>Product Invoices ({invoices.length})</span>
              </button>
            </div>
          </div>

          {/* Subscriptions Sub-Tab */}
          {billingSubTab === 'subscriptions' && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-500" />
                Active Recurring Subscriptions
              </h3>

              {subscriptions.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground">No active recurring subscriptions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3.5">Subscription Ref</th>
                        <th className="p-3.5">Plan / Service Name</th>
                        <th className="p-3.5">Billing Cycle</th>
                        <th className="p-3.5">Recurring Amount</th>
                        <th className="p-3.5">Next Billing Date</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {subscriptions.map((s) => (
                        <tr key={s._id} className="hover:bg-muted/50 transition">
                          <td className="p-3.5 font-mono font-bold text-primary">{s.subscriptionNumber}</td>
                          <td className="p-3.5 font-bold text-foreground">{s.planName}</td>
                          <td className="p-3.5 font-semibold text-muted-foreground">{s.billingCycle}</td>
                          <td className="p-3.5 font-extrabold text-success text-sm">₹{s.amount?.toLocaleString()}</td>
                          <td className="p-3.5 text-muted-foreground font-medium">
                            {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/30">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Product Invoices Sub-Tab */}
          {billingSubTab === 'products' && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-amber-500" />
                One-Time Hardware & Product Invoices
              </h3>

              {invoices.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground">No product invoices found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3.5">Invoice Ref</th>
                        <th className="p-3.5">Items Shipped</th>
                        <th className="p-3.5">Subtotal</th>
                        <th className="p-3.5">Grand Total</th>
                        <th className="p-3.5">Payment Status</th>
                        <th className="p-3.5">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-muted/50 transition">
                          <td className="p-3.5 font-bold text-primary">{inv.invoiceNumber}</td>
                          <td className="p-3.5">
                            {inv.items?.map((item, idx) => (
                              <div key={idx} className="text-xs font-medium">
                                {item.shippedQuantity}x {item.product?.name || 'Product SKU'}
                              </div>
                            ))}
                          </td>
                          <td className="p-3.5 font-semibold text-muted-foreground">₹{inv.subtotal?.toLocaleString()}</td>
                          <td className="p-3.5 font-extrabold text-foreground text-sm">₹{inv.grandTotal?.toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'Paid' ? 'bg-success/10 text-success border border-success/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-medium">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MESSAGES (CHAT WITH ASSIGNED SALES REP ONLY) */}
      {activeTab === 'messages' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Direct Communication
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Communicate directly with your assigned Sales Representative</p>
          </div>

          {/* Assigned Sales Rep Profile Card */}
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center font-extrabold text-white text-lg shadow">
                {assignedRep?.name ? assignedRep.name.charAt(0) : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-foreground">{assignedRep?.name || 'Assigned Representative'}</h3>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{assignedRep?.email || 'salesrep@dealflow360.com'}</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-lg border border-border">
              Assigned Contact
            </span>
          </div>

          {/* Chat Messages Thread */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col h-96">
            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs font-medium text-muted-foreground text-center">
                    No previous messages. Start a conversation with {assignedRep?.name || 'your Sales Representative'}.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isMe = msg.sender?._id === customerInfo?._id || msg.senderRole === 'CUSTOMER';
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-md p-3 rounded-2xl text-xs space-y-1 ${
                        isMe ? 'bg-primary text-white rounded-br-none' : 'bg-muted text-foreground border border-border rounded-bl-none'
                      }`}>
                        <p className="font-medium">{msg.content}</p>
                        <span className={`text-[9px] block text-right ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="pt-3 border-t border-border flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Type a message to ${assignedRep?.name || 'Representative'}...`}
                className="flex-1 bg-input border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: PROFILE */}
      {activeTab === 'profile' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Customer Profile & Account Settings
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your authenticated corporate account details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Company Information</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Account Name:</span>
                  <p className="text-sm font-bold text-foreground">{customerInfo?.name || 'Acme Corp'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Account Tier:</span>
                  <p className="text-xs font-bold text-success">{customerInfo?.tier || 'Gold Account'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Primary Contact Email:</span>
                  <p className="text-xs font-bold text-foreground">{customerInfo?.email || 'customer@acmecorp.com'}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Assigned Operations Team</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Sales Representative:</span>
                  <p className="text-sm font-bold text-foreground">{assignedRep?.name || 'Sales Representative'}</p>
                  <p className="text-xs text-muted-foreground">{assignedRep?.email || 'salesrep@dealflow360.com'}</p>
                </div>
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/30">
                    Data Security & Isolation Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: DISCARDED RECORDS */}
      {activeTab === 'discarded' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-rose-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Discarded Records & Soft-Deleted Items
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Archived requests and quotations. Soft-deleted from active workflows while maintaining complete audit logs in MongoDB.</p>
          </div>

          {/* Discarded Customer Requests */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Discarded Product Requests</h3>
            {customerRequests.filter(r => r.status === 'DISCARDED').length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No discarded product requests.</p>
            ) : (
              <div className="space-y-2">
                {customerRequests.filter(r => r.status === 'DISCARDED').map(reqItem => (
                  <div key={reqItem._id} className="p-3.5 rounded-xl bg-card border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-400">{reqItem.requestNumber}</span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Products: {reqItem.items?.map(i => `${i.quantity}x ${i.product?.name || 'Product'}`).join(', ')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      DISCARDED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discarded Quotations */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Discarded Quotations</h3>
            {quotations.filter(q => q.status === 'DISCARDED').length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No discarded quotations.</p>
            ) : (
              <div className="space-y-2">
                {quotations.filter(q => q.status === 'DISCARDED').map(q => (
                  <div key={q._id} className="p-3.5 rounded-xl bg-card border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-400">{q.quoteNumber}</span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">Grand Total: ₹{q.grandTotal?.toLocaleString()}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      DISCARDED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: CLOSED DEALS */}
      {activeTab === 'closed' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 border-l-4 border-l-emerald-500">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Closed Deals & Finalized Negotiations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Completed agreements finalized through dual confirmation (Customer YES + Sales Rep YES). Archived from active queues.</p>
          </div>

          {quotations.filter(q => q.status === 'Closed' || q.status === 'Confirmed').length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground">No closed deals found yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotations.filter(q => q.status === 'Closed' || q.status === 'Confirmed').map((q) => (
                <div key={q._id} className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <span className="text-xs font-extrabold text-emerald-400">{q.quoteNumber}</span>
                      <p className="text-[11px] text-muted-foreground font-semibold">Grand Total: ₹{q.grandTotal?.toLocaleString()}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CLOSED / ACCEPTED ✓
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground flex items-center justify-between">
                      <span>Assigned Sales Rep:</span>
                      <span className="font-bold text-foreground">{q.salesRep?.name || assignedRep?.name || 'Sales Rep'}</span>
                    </p>
                    <p className="text-muted-foreground flex items-center justify-between">
                      <span>Line Items:</span>
                      <span className="font-bold text-foreground">{q.items?.length || 0} product(s)</span>
                    </p>
                    {q.acceptedAt && (
                      <p className="text-muted-foreground flex items-center justify-between text-[11px]">
                        <span>Finalized Date:</span>
                        <span className="font-semibold text-slate-300">{new Date(q.acceptedAt).toLocaleString()}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border flex justify-end">
                    <button
                      onClick={() => handleOpenQuotationNegotiation(q._id)}
                      className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-card font-bold text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View Full Negotiation History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW QUOTATION DETAIL MODAL */}
      {selectedQuotationView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Quotation Details ({selectedQuotationView.quoteNumber})
                </h3>
                <p className="text-xs text-muted-foreground">Issued by {selectedQuotationView.salesRep?.name || assignedRep?.name || 'Sales Representative'}</p>
              </div>
              <button
                onClick={() => setSelectedQuotationView(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Unit Price</th>
                      <th className="p-2.5">Discount</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedQuotationView.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-foreground">{item.product?.name || 'Product'}</td>
                        <td className="p-2.5 font-semibold">{item.quantity}</td>
                        <td className="p-2.5 font-medium">₹{item.unitPrice?.toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-emerald-500">{item.discountPercent}%</td>
                        <td className="p-2.5 text-right font-extrabold text-foreground">₹{item.lineTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-muted/50 p-4 rounded-xl space-y-1 text-right font-semibold">
                <p className="text-muted-foreground">Subtotal: <span className="text-foreground">₹{selectedQuotationView.subtotal?.toLocaleString()}</span></p>
                <p className="text-muted-foreground">GST / Tax (18%): <span className="text-foreground">₹{selectedQuotationView.tax?.toLocaleString()}</span></p>
                <p className="text-sm font-extrabold text-primary pt-1 border-t border-border">Grand Total: ₹{selectedQuotationView.grandTotal?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setSelectedQuotationView(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACCEPT QUOTATION MODAL */}
      {acceptModalQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Confirm Acceptance
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to accept quotation <strong className="text-foreground">{acceptModalQuote.quoteNumber}</strong> for <strong className="text-primary">₹{acceptModalQuote.grandTotal?.toLocaleString()}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptModalQuote(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptQuotation}
                className="px-4 py-2 rounded-xl bg-success hover:bg-emerald-600 text-white font-bold text-xs shadow transition inline-flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REJECT QUOTATION MODAL */}
      {rejectModalQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                Reject Quotation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to reject quotation <strong className="text-foreground">{rejectModalQuote.quoteNumber}</strong>?
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Optional Rejection Reason</label>
              <textarea
                rows="2"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Budget constraints or pricing exceeds target."
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalQuote(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectQuotation}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow transition inline-flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPEN NEGOTIATION PROPOSAL MODAL */}
      {openNegModalQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Open Negotiation ({openNegModalQuote.quoteNumber})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Submit your proposed discount percentage to your assigned Sales Representative</p>
            </div>

            <form onSubmit={handleOpenNegotiationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Proposed Counter Discount (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={openNegDiscount}
                  onChange={(e) => setOpenNegDiscount(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Message / Requested Changes</label>
                <textarea
                  rows="2"
                  value={openNegMessage}
                  onChange={(e) => setOpenNegMessage(e.target.value)}
                  placeholder="e.g. Can you offer 12% discount for 5 units?"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenNegModalQuote(null)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Negotiation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW PRODUCT REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Submit New Product Request
                </h3>
                <p className="text-xs text-muted-foreground">Select products, quantities, and your desired discount %</p>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="space-y-3">
                {requestItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Item #{idx + 1}</span>
                      {requestItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                        className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        {productsCatalog.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.category}) - ₹{p.unitPrice?.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Desired Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={item.desiredDiscountPercent}
                          onChange={(e) => handleItemChange(idx, 'desiredDiscountPercent', e.target.value)}
                          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 rounded-xl bg-muted border border-dashed border-border text-xs font-bold text-foreground hover:bg-card transition"
              >
                + Add Another Product
              </button>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Optional Message / Special Instructions</label>
                <textarea
                  rows="2"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. Need delivery by end of month."
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingRequest ? 'Submitting Request...' : 'Send Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN NEGOTIATION MODAL */}
      {reopenModalQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-left">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                Reopen Negotiation ({reopenModalQuote.quoteNumber})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Propose a new counter discount to reopen manager review workflow</p>
            </div>

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">New Proposed Discount (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newProposedDiscount}
                  onChange={(e) => setNewProposedDiscount(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Message / Reason for Reopening</label>
                <textarea
                  required
                  rows="3"
                  value={reopenMessage}
                  onChange={(e) => setReopenMessage(e.target.value)}
                  placeholder="e.g. We are willing to increase commitment volume if 8% discount is granted."
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenModalQuote(null)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReopen ? 'Submitting...' : 'Submit Reopen Proposal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Negotiation Drawer Component */}
      <NegotiationDrawer
        isOpen={!!activeNegotiationId}
        negotiationId={activeNegotiationId}
        quotationId={activeNegotiationId}
        onClose={() => setActiveNegotiationId(null)}
        onSuccess={fetchCustomerData}
      />

    </div>
  );
};

export default CustomerPortal;
