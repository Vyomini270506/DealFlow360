import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, Send, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DealPipeline from './DealPipeline';

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

  const handleConfirmDealTerms = async () => {
    if (!negotiation?._id) return;
    try {
      const quoteId = negotiation.quotation?._id || negotiation.quotation;
      const { data } = await API.post(`/negotiations/quotation/${quoteId}/accept`);
      
      if (data.isClosed) {
        toast.success('🎉 Deal finalized & CLOSED! Dual confirmation completed.');
      } else {
        toast.info(data.message || 'Your confirmation saved! Waiting for counterparty confirmation.');
      }
      
      fetchNegotiation();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm negotiation');
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

  const handleWithdrawNegotiation = async () => {
    if (!negotiation?._id) return;
    if (!window.confirm('Are you sure you want to close this negotiation window and withdraw from this deal?')) {
      return;
    }
    try {
      await API.post(`/negotiations/${negotiation._id}/withdraw`);
      toast.info('Negotiation thread terminated and deal withdrawn.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw negotiation');
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

    if (counterDiscount !== '' && negotiation?.managerMaxAllowedDiscount !== null && negotiation?.managerMaxAllowedDiscount !== undefined) {
      if (Number(counterDiscount) > negotiation.managerMaxAllowedDiscount) {
        toast.error(`Proposed discount (${counterDiscount}%) exceeds Sales Manager's authorized maximum limit of ${negotiation.managerMaxAllowedDiscount}%.`);
        return;
      }
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
  const isDealClosed = negotiation?.status === 'Closed' || quotation?.status === 'Closed';

  const isCustomerConfirmed = negotiation?.customerConfirmation?.status === 'CONFIRMED';
  const isRepConfirmed = negotiation?.salesRepConfirmation?.status === 'CONFIRMED';

  const userHasConfirmed = user.role === 'CUSTOMER' ? isCustomerConfirmed : isRepConfirmed;

  const refNumber = quotation?.quoteNumber || customerRequest?.requestNumber || 'Negotiation';
  const customerName = negotiation?.customer?.name || negotiation?.customer?.company || 'Customer';
  const repName = negotiation?.salesRep?.name || 'Assigned Sales Rep';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end text-left">
      <div className="bg-[#161D29] border-l border-[#242C3A] w-full max-w-xl h-full flex flex-col shadow-2xl animate-slide-right">
        
        {/* Header */}
        <div className="p-6 border-b border-[#242C3A] flex items-center justify-between bg-[#0D111A]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#F5F7FA]">
                NEGOTIATION #{refNumber}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isDealClosed ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30' : 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30'
              }`}>
                ● {isDealClosed ? 'FINALIZED' : 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-[#A7B0C0] mt-1">
              Customer: <span className="text-[#F5F7FA] font-semibold">{customerName}</span> | Rep: <span className="text-[#818CF8] font-semibold">{repName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isDealClosed && (
              <button
                onClick={handleWithdrawNegotiation}
                title="Close & Withdraw Negotiation"
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1"
              >
                Withdraw / Close Deal
              </button>
            )}
            <button onClick={onClose} title="Close Window" className="p-1.5 rounded-lg text-[#687386] hover:text-[#F5F7FA] hover:bg-[#111722]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Deal Stage Pipeline Stepper */}
          <DealPipeline currentStage={quotation?.status || customerRequest?.status || negotiation?.status} />

          {/* DEAL SUMMARY CARD */}
          <div className="p-4 rounded-2xl bg-[#111722] border border-[#242C3A] space-y-3">
            <div className="flex items-center justify-between border-b border-[#242C3A] pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A7B0C0]">
                DEAL SUMMARY
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                isDealClosed ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30' : 'bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/30'
              }`}>
                {isDealClosed ? 'Finalized ✓' : 'Active ⚡'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Original Price</p>
                <p className="font-bold text-[#F5F7FA] mt-0.5 font-mono-numeric">₹{quotation?.subtotal?.toLocaleString() || '—'}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Current Offer</p>
                <p className="font-bold text-[#818CF8] mt-0.5 font-mono-numeric">₹{quotation?.grandTotal?.toLocaleString() || '—'}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Discount</p>
                <p className="font-bold text-[#F59E0B] mt-0.5 font-mono-numeric">{negotiation?.currentRequestedDiscount || 0}%</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Manager Max</p>
                <p className="font-bold text-[#22C55E] mt-0.5 font-mono-numeric">
                  {negotiation?.managerMaxAllowedDiscount !== null && negotiation?.managerMaxAllowedDiscount !== undefined ? `${negotiation.managerMaxAllowedDiscount}%` : '10%'}
                </p>
              </div>
            </div>
          </div>

          {/* DUAL CONFIRMATION STATUS CARD */}
          <div className="p-4 rounded-xl bg-[#111722] border border-[#242C3A] space-y-3">
            <div className="flex items-center justify-between border-b border-[#242C3A] pb-2">
              <span className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Dual Confirmation Status
              </span>
              {isDealClosed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                  DEAL CLOSED & FINALIZED ✓
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                  ACTIVE NEGOTIATION
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Customer Confirmation</p>
                <p className={`font-bold mt-0.5 ${isCustomerConfirmed ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
                  {isCustomerConfirmed ? 'CONFIRMED ✓' : 'PENDING ⏳'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#161D29] border border-[#242C3A]">
                <p className="text-[11px] text-[#687386] font-semibold">Sales Rep Confirmation</p>
                <p className={`font-bold mt-0.5 ${isRepConfirmed ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
                  {isRepConfirmed ? 'CONFIRMED ✓' : 'PENDING ⏳'}
                </p>
              </div>
            </div>

            {!isDealClosed && (
              <div className="flex items-center gap-2 pt-1">
                {!userHasConfirmed && (
                  <button
                    onClick={handleConfirmDealTerms}
                    className="flex-1 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> [ Confirm & Accept Deal Terms ]
                  </button>
                )}
                <button
                  onClick={handleWithdrawNegotiation}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition flex items-center justify-center gap-1 shrink-0"
                >
                  Withdraw / Terminate Deal
                </button>
              </div>
            )}

            {!isDealClosed && userHasConfirmed && (
              <p className="text-xs text-[#22C55E] font-medium text-center bg-[#22C55E]/10 p-2 rounded-lg border border-[#22C55E]/30">
                ✓ You have confirmed terms. Waiting for counterparty confirmation to finalize & close.
              </p>
            )}
          </div>

          {/* MANAGER AUTHORIZATION CEILING CARD */}
          {negotiation?.managerMaxAllowedDiscount !== null && negotiation?.managerMaxAllowedDiscount !== undefined && (
            <div className="p-4 rounded-xl bg-[#111722] border border-[#F59E0B]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> MANAGER MAXIMUM AUTHORIZED DISCOUNT
                </span>
                <span className="text-sm font-bold text-[#F59E0B] font-mono-numeric">
                  {negotiation.managerMaxAllowedDiscount}%
                </span>
              </div>
              <p className="text-xs text-[#A7B0C0]">
                Allowed negotiation ceiling range: <span className="font-bold text-[#F5F7FA]">0% — {negotiation.managerMaxAllowedDiscount}%</span>. Any counter-offer exceeding this ceiling requires Manager approval.
              </p>
            </div>
          )}

          {/* Sales Manager Instruction Banner */}
          {customerRequest?.managerComment && (
            <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-semibold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#F59E0B] uppercase tracking-wider text-[10px]">Sales Manager Instruction:</span>
                <p className="mt-0.5 font-medium text-[#F5F7FA] leading-relaxed">{customerRequest.managerComment}</p>
              </div>
            </div>
          )}
          
          {/* Line Item Selector */}
          {items && items.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#A7B0C0] mb-2">Select Line Item for Counter Offer</label>
              <div className="grid grid-cols-1 gap-2">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedItemIndex(idx)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      selectedItemIndex === idx
                        ? 'bg-[#6366F1]/15 border-[#6366F1] text-[#F5F7FA]'
                        : 'bg-[#111722] border-[#242C3A] text-[#A7B0C0] hover:bg-[#161D29]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{item.product?.name || `Product #${idx + 1}`}</p>
                      <p className="text-[11px] text-[#687386]">
                        Qty: {item.quantity} | Discount: <span className="font-bold text-[#F59E0B]">{item.discountPercent || item.desiredDiscountPercent || 0}%</span>
                      </p>
                    </div>
                    {item.lineTotal && (
                      <p className="text-xs font-bold text-[#818CF8]">₹{item.lineTotal?.toLocaleString()}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OFFER HISTORY MESSAGES */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#687386] uppercase tracking-wider">OFFER HISTORY</h3>
            
            {loading ? (
              <p className="text-xs text-[#687386]">Loading offer history from backend...</p>
            ) : !negotiation?.messages || negotiation.messages.length === 0 ? (
              <p className="text-xs text-[#687386] italic">No previous counter offers. Enter your offer below.</p>
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
                          ? 'bg-[#6366F1]/10 border-[#6366F1]/30 ml-6 text-[#F5F7FA]'
                          : 'bg-[#111722] border-[#242C3A] mr-6 text-[#F5F7FA]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#A7B0C0]">
                        <span className="font-bold text-[#818CF8]">{msg.sender?.name || msg.senderRole}</span>
                        <span className="text-[#687386]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {item && (
                        <p className="text-[11px] text-[#818CF8] font-bold bg-[#161D29] px-2 py-0.5 rounded inline-block">
                          Re: {item.product?.name || `Item #${msg.itemIndex + 1}`}
                        </p>
                      )}

                      <p className="text-xs leading-relaxed text-[#F5F7FA]">{msg.message}</p>

                      {msg.counterDiscountPercent !== null && msg.counterDiscountPercent !== undefined && (
                        <div className="mt-1 bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-2 rounded text-[#F59E0B] font-semibold text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Proposed Counter Discount: <span className="font-bold text-[#F5F7FA]">{msg.counterDiscountPercent}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* OFFER COMPOSER FOOTER */}
        {isDealClosed ? (
          <div className="p-4 border-t border-[#242C3A] bg-[#0D111A] text-center">
            <p className="text-xs font-bold text-[#22C55E] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> This negotiation is CLOSED.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#242C3A] bg-[#0D111A] space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#A7B0C0]">
                  Enter Counter Discount %
                </label>
                {negotiation?.managerMaxAllowedDiscount !== null && negotiation?.managerMaxAllowedDiscount !== undefined && (
                  <span className="text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/30">
                    Max Allowed: {negotiation.managerMaxAllowedDiscount}%
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                max={negotiation?.managerMaxAllowedDiscount ?? 100}
                value={counterDiscount}
                onChange={(e) => setCounterDiscount(e.target.value)}
                placeholder={negotiation?.managerMaxAllowedDiscount !== null && negotiation?.managerMaxAllowedDiscount !== undefined ? `Max allowed: ${negotiation.managerMaxAllowedDiscount}%` : "e.g. 8"}
                className="w-full bg-[#111722] border border-[#242C3A] rounded-xl px-3.5 py-2 text-xs text-[#F5F7FA] font-bold placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter offer message or negotiation terms..."
                className="flex-1 bg-[#111722] border border-[#242C3A] rounded-xl px-3.5 py-2 text-xs text-[#F5F7FA] placeholder-[#687386] focus:border-[#6366F1] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Send Offer →
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default NegotiationDrawer;
