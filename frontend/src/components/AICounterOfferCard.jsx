import React, { useState } from 'react';
import API from '../services/api';
import { Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const AICounterOfferCard = ({ quotationId, requestedDiscountPercent, onApplyCounter }) => {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const { data } = await API.post(`/intelligence/counter-offer/${quotationId}`, {
        requestedDiscountPercent
      });
      setRecommendation(data);
    } catch (err) {
      toast.error('Failed to calculate AI counter-offer recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-tr from-indigo-950/40 via-card to-card border border-indigo-500/30 space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">AI Best Counter-Offer Engine</h4>
        </div>

        <button
          type="button"
          onClick={fetchRecommendation}
          disabled={loading}
          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition inline-flex items-center gap-1"
        >
          {loading ? 'Analyzing...' : 'Generate Smart Counter →'}
        </button>
      </div>

      {recommendation && (
        <div className="space-y-2 text-xs pt-1 border-t border-indigo-500/20 animate-in fade-in">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 space-y-1">
            <p className="text-xs font-extrabold text-foreground">{recommendation.recommendationSummary}</p>
            <p className="text-[11px] text-emerald-400 font-bold">
              Protected Margin: ₹{recommendation.estimatedMarginProtected?.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Bundled Value Perks:</span>
            <ul className="space-y-1">
              {recommendation.perks?.map((perk, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {onApplyCounter && (
            <button
              type="button"
              onClick={() => onApplyCounter(recommendation.recommendedDiscount, recommendation.perks.join(' + '))}
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition mt-1"
            >
              Apply {recommendation.recommendedDiscount}% Discount + Perks to Counter Offer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AICounterOfferCard;
