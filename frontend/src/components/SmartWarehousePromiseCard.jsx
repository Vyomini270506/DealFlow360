import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Truck, Calendar, Building2, PackageCheck } from 'lucide-react';

const SmartWarehousePromiseCard = ({ items }) => {
  const [promise, setPromise] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items && items.length > 0) {
      fetchPromise();
    }
  }, [items]);

  const fetchPromise = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/intelligence/warehouse-promise', { items });
      setPromise(data);
    } catch (err) {
      console.error('Failed warehouse promise fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !promise) return null;

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Delivery Promise & Warehouse Fulfillment</h4>
        </div>
        <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
          Complete Delivery: {promise.completeDeliveryDate}
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        {promise.deliveryPromise?.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1.5">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>{item.product}</span>
              <span className="text-[11px] text-muted-foreground">{item.requestedQuantity} unit(s) requested</span>
            </div>

            <div className="space-y-1 pl-2 border-l-2 border-primary/40 text-[11px]">
              {item.splits?.map((split, sIdx) => (
                <div key={sIdx} className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-primary shrink-0" />
                    <strong className="text-foreground">{split.warehouse}</strong>: {split.quantity} unit(s)
                  </span>
                  <span className="font-semibold text-emerald-400">Expected: {split.expectedDate}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartWarehousePromiseCard;
