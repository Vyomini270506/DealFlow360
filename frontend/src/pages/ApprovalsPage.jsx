import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import { CheckSquare, ShieldAlert, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/approvals');
      setApprovals(data);
    } catch (err) {
      toast.error('Failed to load approvals queue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Approvals Workflow Queue</h1>
        <p className="text-xs text-slate-400">Review pending deal approvals, risk factor reasons, and perform role-based signoffs</p>
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading approvals...</p>
        ) : approvals.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No pending approvals found in your queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Quote Number</th>
                  <th className="p-3">Current Approval Step</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Deal Value</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {approvals.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{app.quotation?.quoteNumber}</td>
                    <td className="p-3 font-semibold text-amber-400">{app.currentStep}</td>
                    <td className="p-3">{app.salesRep?.name}</td>
                    <td className="p-3 font-semibold text-slate-200">{app.quotation?.customer?.company}</td>
                    <td className="p-3 font-extrabold text-indigo-300">₹{app.quotation?.grandTotal?.toLocaleString()}</td>
                    <td className="p-3">
                      <RiskBadge level={app.riskLevel} score={app.riskScore} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                      >
                        Review & Decision
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApprovalModal
        isOpen={!!selectedApproval}
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onSuccess={fetchApprovals}
      />

    </div>
  );
};

export default ApprovalsPage;
