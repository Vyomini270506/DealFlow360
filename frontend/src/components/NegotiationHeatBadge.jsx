import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Flame } from 'lucide-react';

const NegotiationHeatBadge = ({ quotationId }) => {
  const [heat, setHeat] = useState(null);

  useEffect(() => {
    if (quotationId) {
      fetchHeat();
    }
  }, [quotationId]);

  const fetchHeat = async () => {
    try {
      const { data } = await API.get(`/intelligence/negotiation-heat/${quotationId}`);
      setHeat(data);
    } catch (err) {
      console.error('Failed negotiation heat fetch:', err);
    }
  };

  if (!heat) return null;

  const color =
    heat.level === 'HIGH'
      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
      : heat.level === 'SENSITIVE'
      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs" title={heat.reasons?.join(', ')}>
      <Flame className={`w-3.5 h-3.5 ${heat.level === 'HIGH' ? 'text-rose-500' : (heat.level === 'SENSITIVE' ? 'text-amber-500' : 'text-emerald-500')}`} />
      <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Negotiation Heat:</span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${color}`}>
        {heat.label}
      </span>
    </div>
  );
};

export default NegotiationHeatBadge;
