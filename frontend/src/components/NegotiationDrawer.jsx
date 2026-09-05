import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, Send, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NegotiationDrawer = ({ isOpen, negotiationId, quotationId, customerRequestId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [negotiation, setNegotiation] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const targetId = negotiationId || quotationId || customerRequestId;

  useEffect(() => {
    if (isOpen && targetId) {
      fetchNegotiation();
    }
  }, [isOpen, targetId]);

  const fetchNegotiation = async () => {
    setLoading(true);
    let loadedData = null;

    try {
      // 1. Try fetching directly as a Negotiation ID
      if (negotiationId || (targetId && targetId.length === 24)) {
        try {
          const { data } = await API.get(`/negotiations/${targetId}`);
          if (data && data._id) loadedData = data;
        } catch (e) {
          // Continue fallback
        }
      }

      // 2. Try fetching by Quotation ID
      if (!loadedData && (quotationId || targetId)) {
        try {
          const { data } = await API.get(`/negotiations/quotation/${quotationId || targetId}`);
          if (data && data._id) loadedData = data;
        } catch (e) {
          // Continue fallback
        }
      }

      // 3. Try fetching by CustomerRequest ID
      if (!loadedData && (customerRequestId || targetId)) {
        try {
          const { data } = await API.get(`/negotiations/customer-request/${customerRequestId || targetId}`);
          if (data && data._id) loadedData = data;
        } catch (e) {
          // Continue fallback
        }
      }

      if (loadedData) {
        setNegotiation(loadedData);
      } else {
        toast.error('Could not load negotiation record');
      }
    } catch (err) {
      toast.error('Failed to load negotiation thread');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptNegotiation = async () => {
    if (!negotiation?._id) return;
    try {
      if (negotiation.quotation?._id) {
        await API.post(`/negotiations/quotation/${negotiation.quotation._id}/accept`);
      } else {
        await API.post(`/negotiations/${negotiation._id}/message`, {
          message: `Negotiation accepted terms by ${user.role}`
        });
      }
      toast.success('Negotiation accepted successfully!');
      fetchNegotiation();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept negotiation');
    }
  };

  const handleEscalateToManager = async () => {
    if (!negotiation?._id) return;
    try {
      if (negotiation.quotation?._id) {
        await API.post(`/negotiations/quotation/${negotiation.quotation._id}/escalate-manager`, {
          reason: 'Discount/Risk score exceeds Sales Rep authority'
        });
      } else {
        await API.post(`/negotiations/${negotiation._id}/message`, {
          message: 'Escalated to Sales Manager for review'
        });
      }
      toast.info('Negotiation sent to Sales Manager for approval!');
      fetchNegotiation();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Escalation failed');
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && (counterDiscount === '' || counterDiscount === null)) {
      toast.error('Please enter a message or counter discount proposal');
      return;
    }

    if (!negotiation?._id) {
      toast.error('No active negotiation thread loaded');
      return;
    }

    setSending(true);
    try {
      const payload = {
        itemIndex: selectedItemIndex,
        message,
        counterDiscountPercent: counterDiscount !== '' ? Number(counterDiscount) : null
      };

      const { data } = await API.post(`/negotiations/${negotiation._id}/message`, payload);
      
      if (data.triggerReapproval) {
        toast.warning('Counter offer exceeds allowed tier discount! Sent to Pending Approval workflow.');
      } else {
        toast.success('Negotiation response sent successfully');
      }

      setMessage('');
      setCounterDiscount('');
      setNegotiation(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const quotation = negotiation?.quotation;
  const customerRequest = negotiation?.customerRequest;
  const items = quotation?.items || customerRequest?.items || [];
  const riskScore = quotation?.riskScore ?? customerRequest?.riskScore ?? 0;
  const riskLevel = quotation?.riskLevel ?? customerRequest?.riskLevel ?? 'LOW';
  const isLowRisk = riskLevel === 'LOW' && riskScore < 30;
  const isPendingManager = negotiation?.status === 'PENDING_MANAGER_APPROVAL' || quotation?.status === 'Pending Approval' || customerRequest?.status === 'Negotiation_Required';

  const refNumber = quotation?.quoteNumber || customerRequest?.requestNumber || 'Negotiation';
  const customerName = negotiation?.customer?.name || negotiation?.customer?.company || 'Customer';
  const repName = negotiation?.salesRep?.name || 'Assigned Sales Rep';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end text-left">
      <div className="bg-slate-900 border-l border-slate-700/80 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Negotiation Thread: {refNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer: <span className="text-white font-semibold">{customerName}</span> | Rep: <span className="text-indigo-400 font-semibold">{repName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Sales Manager Instruction Banner */}
          {customerRequest?.managerComment && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-amber-400 uppercase tracking-wider text-[10px]">Sales Manager Instruction:</span>
                <p className="mt-0.5 font-medium text-amber-200 leading-relaxed">{customerRequest.managerComment}</p>
              </div>
            </div>
          )}

          {/* Risk Assessment & Authority Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Risk Assessment & Authority
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Risk Score: <span className="font-bold text-white">{riskScore}</span> | Level: <span className="font-bold text-amber-400">{riskLevel}</span></p>
              </div>

              {isPendingManager ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  WAITING FOR SALES MANAGER APPROVAL
                </span>
              ) : isLowRisk ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Within Rep Authority
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Exceeds Rep Authority
                </span>
              )}
            </div>

            {/* Action Buttons for Sales Rep */}
            {user.role === 'SALES_REP' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                {isLowRisk && !isPendingManager && quotation?.status !== 'Confirmed' && (
                  <button
                    onClick={handleAcceptNegotiation}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                  >
                    [ Accept Negotiation ]
                  </button>
                )}

                {(!isLowRisk || isPendingManager) && quotation?.status !== 'Confirmed' && (
                  <button
                    onClick={handleEscalateToManager}
                    disabled={isPendingManager}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition ${
                      isPendingManager
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow'
                    }`}
                  >
                    {isPendingManager ? 'WAITING FOR SALES MANAGER APPROVAL' : '[ SEND TO SALES MANAGER ]'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Item Selector Tabs */}
          {items && items.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Select Line Item for Counter Offer</label>
              <div className="grid grid-cols-1 gap-2">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedItemIndex(idx)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      selectedItemIndex === idx
                        ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{item.product?.name || `Product #${idx + 1}`}</p>
                      <p className="text-[11px] text-slate-400">
                        Qty: {item.quantity} | Current Discount: <span className="font-bold text-amber-400">{item.discountPercent || item.desiredDiscountPercent || 0}%</span>
                      </p>
                    </div>
                    {item.lineTotal && (
                      <p className="text-xs font-extrabold text-indigo-400">₹{item.lineTotal?.toLocaleString()}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation History</h3>
            
            {loading ? (
              <p className="text-xs text-slate-500">Loading messages from MongoDB...</p>
            ) : !negotiation?.messages || negotiation.messages.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No messages yet. Start negotiation below.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {negotiation.messages.map((msg, idx) => {
                  const isMe = msg.sender?._id === user._id || msg.senderRole === user.role;
                  const item = items[msg.itemIndex];

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        isMe
                          ? 'bg-indigo-950/50 border-indigo-800/60 ml-6 text-indigo-100'
                          : 'bg-slate-950/80 border-slate-800 mr-6 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span className="font-bold text-indigo-300">{msg.sender?.name || msg.senderRole}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {item && (
                        <p className="text-[10px] text-indigo-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded inline-block">
                          Re: {item.product?.name || `Item #${msg.itemIndex + 1}`}
                        </p>
                      )}

                      <p className="text-xs leading-relaxed">{msg.message}</p>

                      {msg.counterDiscountPercent !== null && msg.counterDiscountPercent !== undefined && (
                        <div className="mt-1 bg-amber-950/60 border border-amber-800/60 p-2 rounded text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Proposed Counter Discount: <span className="font-bold text-amber-200">{msg.counterDiscountPercent}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-amber-400 mb-1">
              Propose Counter Discount % (Optional)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={counterDiscount}
              onChange={(e) => setCounterDiscount(e.target.value)}
              placeholder="e.g. 15"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your question or negotiation comment..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default NegotiationDrawer;
