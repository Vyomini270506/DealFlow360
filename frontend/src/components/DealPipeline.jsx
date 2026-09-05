import React from 'react';
import { ShoppingCart, FileText, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 'request', label: 'Request', icon: ShoppingCart, desc: 'Product Inquiries' },
  { id: 'quotation', label: 'Quotation', icon: FileText, desc: 'Official Pricing' },
  { id: 'negotiation', label: 'Negotiation', icon: MessageSquare, desc: 'Counter Offers' },
  { id: 'approval', label: 'Approval', icon: ShieldCheck, desc: 'Manager Sign-off' },
  { id: 'closed', label: 'Closed Deal', icon: CheckCircle2, desc: 'Mutual Confirmation' },
];

const DealPipeline = ({ currentStage = 'quotation', className = '' }) => {
  const getStageIndex = (stage) => {
    switch ((stage || '').toLowerCase()) {
      case 'submitted':
      case 'processing':
      case 'request':
        return 0;
      case 'draft':
      case 'quoted':
      case 'quotation':
        return 1;
      case 'open':
      case 'active':
      case 'under review':
      case 'negotiation':
      case 'negotiation_required':
      case 're-approval required':
        return 2;
      case 'pending approval':
      case 'escalated_manager':
      case 'waiting_for_finance':
      case 'approval':
        return 3;
      case 'closed':
      case 'confirmed':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  const activeIdx = getStageIndex(currentStage);

  return (
    <div className={`p-5 rounded-2xl bg-[#111722] border border-[#242C3A] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687386] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
          Deal Lifecycle Pipeline
        </h3>
        <span className="text-xs font-bold text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Stage: {steps[activeIdx]?.label || 'Active'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 relative">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isPassed = idx < activeIdx;
          const isActive = idx === activeIdx;

          return (
            <div key={step.id} className="flex flex-col items-center text-center relative group">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-[2px] -z-0 transition-colors duration-200 ${
                    idx <= activeIdx ? 'bg-[#6366F1]' : 'bg-[#242C3A]'
                  }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center z-10 transition-all duration-200 ${
                  isActive
                    ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30 ring-4 ring-[#6366F1]/20 scale-105'
                    : isPassed
                    ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#161D29] border border-[#242C3A] text-[#687386]'
                }`}
              >
                <StepIcon className="w-4 h-4" />
              </div>

              <span
                className={`text-xs font-semibold mt-2 transition-colors ${
                  isActive ? 'text-[#F5F7FA] font-bold' : isPassed ? 'text-[#A7B0C0]' : 'text-[#687386]'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[11px] text-[#687386] hidden sm:block mt-0.5">{step.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealPipeline;
