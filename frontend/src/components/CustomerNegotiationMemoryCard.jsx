import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { History, Brain, Tag, RotateCcw } from 'lucide-react';

const CustomerNegotiationMemoryCard = ({ customerId }) => {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchMemory();
    }
  }, [customerId]);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/intelligence/customer-memory/${customerId}`);
      setMemory(data);
    } catch (err) {
      console.error('Failed customer memory fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!memory || !memory.hasData) {
    return (
      <div className="p-3.5 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground italic shadow-sm">
        Customer Negotiation Insights: Not enough historical data
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Brain className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Customer Negotiation Insights</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground block">Previous Closed Deals:</span>
          <span className="font-extrabold text-foreground">{memory.previousNegotiationsCount}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground block">Typical Discount:</span>
          <span className="font-extrabold text-amber-500">{memory.typicalDiscountRange}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground block">Avg Counter Rounds:</span>
          <span className="font-extrabold text-foreground">{memory.averageCounterRounds}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground block">Last Accepted Discount:</span>
          <span className="font-extrabold text-emerald-500">{memory.lastAcceptedDiscount}</span>
        </div>
      </div>

      {memory.preferredProducts && memory.preferredProducts.length > 0 && (
        <div className="pt-2 border-t border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Preferred Products:</span>
          <div className="flex flex-wrap gap-1">
            {memory.preferredProducts.map((p, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-bold text-foreground">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNegotiationMemoryCard;
