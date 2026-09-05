import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';
import { X, Send, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NegotiationDrawer = ({ isOpen, quotationId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [negotiation, setNegotiation] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && quotationId) {
      fetchNegotiation();
    }
  }, [isOpen, quotationId]);

  const fetchNegotiation = async () => {
    setLoading(true);
    try {
      const [negRes, quoteRes] = await Promise.all([
        API.get(`/negotiations/quotation/${quotationId}`),
        API.get(`/quotations/${quotationId}`)
      ]);
      setNegotiation(negRes.data);
      setQuotation(quoteRes.data.quotation);
    } catch (err) {
      toast.error('Failed to load negotiation thread');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && !counterDiscount) {
      toast.error('Please enter a message or counter discount proposal');
      return;
    }

    setSending(true);
    try {
      const payload = {
        itemIndex: selectedItemIndex,
        message,
        counterDiscountPercent: counterDiscount !== '' ? Number(counterDiscount) : null
      };

      const { data } = await API.post(`/negotiations/quotation/${quotationId}/message`, payload);
      
      if (data.triggerReapproval) {
        toast.warning('Counter offer exceeds allowed tier discount! Quotation automatically sent to Pending Approval workflow.');
      } else {
        toast.success('Negotiation response sent successfully');
      }

      setMessage('');
      setCounterDiscount('');
      fetchNegotiation();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-700/80 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Negotiation Thread: {quotation?.quoteNumber}
            </h2>
            <p className="text-xs text-slate-400">Ask questions or request discount counter-offers on line items</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Item Selector Tabs */}
          {quotation?.items && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Select Quotation Line Item</label>
              <div className="grid grid-cols-1 gap-2">
                {quotation.items.map((item, idx) => (
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
                      <p className="text-xs font-bold">{item.product?.name}</p>
                      <p className="text-[11px] text-slate-400">Qty: {item.quantity} | Discount: {item.discountPercent}%</p>
                    </div>
                    <p className="text-xs font-extrabold text-indigo-400">₹{item.lineTotal?.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation History</h3>
            
            {loading ? (
              <p className="text-xs text-slate-500">Loading messages...</p>
            ) : negotiation?.messages?.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No messages yet. Start negotiation below.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {negotiation?.messages?.map((msg, idx) => {
                  const isMe = msg.sender?._id === user._id || msg.senderRole === user.role;
                  const item = quotation?.items[msg.itemIndex];

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
                        <span>{msg.sender?.name || msg.senderRole}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {item && (
                        <p className="text-[10px] text-indigo-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded inline-block">
                          Re: {item.product?.name}
                        </p>
                      )}

                      <p className="text-xs leading-relaxed">{msg.message}</p>

                      {msg.counterDiscountPercent !== null && (
                        <div className="mt-1 bg-amber-950/60 border border-amber-800/60 p-2 rounded text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Proposed Counter Discount: {msg.counterDiscountPercent}%
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
          {user.role === 'CUSTOMER' && (
            <div>
              <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                Request Counter Discount % (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={counterDiscount}
                onChange={(e) => setCounterDiscount(e.target.value)}
                placeholder="e.g. 18"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

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
