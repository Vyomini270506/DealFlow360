import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Repeat, Calendar, ShieldCheck, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/subscriptions');
      setSubscriptions(data);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (subId, newStatus) => {
    try {
      await API.put(`/subscriptions/${subId}/status`, { status: newStatus });
      toast.success(`Subscription status updated to '${newStatus}'`);
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to update subscription status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Subscription Engine & Recurring Billing</h1>
        <p className="text-xs text-slate-400">Manage monthly and yearly recurring customer contracts and billing cycles</p>
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" /> Active Subscriptions List
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading subscriptions...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Sub ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Next Renewal</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono text-purple-400 font-bold">{sub.subscriptionNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{sub.customer?.company}</td>
                    <td className="p-3 font-bold text-white">{sub.planName}</td>
                    <td className="p-3 text-slate-300">{sub.billingCycle}</td>
                    <td className="p-3 font-extrabold text-emerald-400">₹{sub.amount?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        sub.status === 'Active'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : sub.status === 'Paused'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(sub.nextBillingDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right space-x-2">
                      {sub.status === 'Active' ? (
                        <button
                          onClick={() => handleStatusChange(sub._id, 'Paused')}
                          className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-semibold text-[11px] hover:bg-amber-900/60 transition"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(sub._id, 'Active')}
                          className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-semibold text-[11px] hover:bg-emerald-900/60 transition"
                        >
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default SubscriptionsPage;
