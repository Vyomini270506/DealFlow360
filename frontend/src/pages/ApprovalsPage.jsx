import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import ApprovalModal from '../components/ApprovalModal';
import { CheckSquare, ShieldAlert, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const ApprovalsPage = () => {
  const { user } = useAuth();
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F7FA] tracking-tight">Approvals Workflow Queue</h1>
          <p className="text-xs text-[#A7B0C0]">Review finalized deal negotiations and risk assessments requiring role-based manager signoff</p>
        </div>

        {/* Status Distinction Legend */}
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/30">ACTIVE NEGOTIATION</span>
          <span className="text-[#687386]">≠</span>
          <span className="px-2.5 py-1 rounded-full bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">FINALIZED</span>
          <span className="text-[#687386]">≠</span>
          <span className="px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">APPROVED</span>
          <span className="text-[#687386]">≠</span>
          <span className="px-2.5 py-1 rounded-full bg-[#94A3B8]/10 text-[#94A3B8] border border-[#94A3B8]/30">CLOSED</span>
        </div>
      </div>

      <div className="bg-[#111722] border border-[#242C3A] rounded-2xl p-5 space-y-4">
        {loading ? (
          <p className="text-xs text-[#687386] py-6 text-center">Loading approvals from backend...</p>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center bg-[#161D29] rounded-xl border border-[#242C3A]">
            <p className="text-xs font-semibold text-[#A7B0C0]">No pending approvals found in your queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F5F7FA]">
              <thead className="bg-[#0D111A] text-[#A7B0C0] font-semibold border-b border-[#242C3A]">
                <tr>
                  <th className="p-3.5">Quote Number</th>
                  <th className="p-3.5">Approval Step</th>
                  <th className="p-3.5">Sales Rep</th>
                  <th className="p-3.5">Customer Account</th>
                  <th className="p-3.5">Deal Value</th>
                  <th className="p-3.5">Risk Level</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242C3A] bg-[#111722]">
                {approvals.map((app) => (
                  <tr key={app._id} className="hover:bg-[#161D29] transition">
                    <td className="p-3.5 font-bold text-[#818CF8]">{app.quotation?.quoteNumber || app.customerRequest?.requestNumber || `Approval #${app._id.slice(-4)}`}</td>
                    <td className="p-3.5 font-semibold text-[#F59E0B]">{app.currentStep}</td>
                    <td className="p-3.5 text-[#A7B0C0]">{app.salesRep?.name || 'Sales Rep'}</td>
                    <td className="p-3.5 font-semibold text-[#F5F7FA]">{app.quotation?.customer?.company || app.quotation?.customer?.name || app.customer?.company || app.customer?.name || 'Customer'}</td>
                    <td className="p-3.5 font-bold text-[#F5F7FA] font-mono-numeric">₹{app.quotation?.grandTotal ? app.quotation.grandTotal.toLocaleString() : '—'}</td>
                    <td className="p-3.5">
                      <RiskBadge level={app.riskLevel} score={app.riskScore} />
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-bold text-xs shadow transition"
                      >
                        {user?.role === 'ADMIN' ? 'View Audit Log' : 'Review & Decision'}
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
