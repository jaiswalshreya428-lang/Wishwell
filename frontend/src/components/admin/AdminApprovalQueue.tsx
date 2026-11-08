import React, { useState, useEffect } from 'react';
import { VerificationSummary } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

export const AdminApprovalQueue: React.FC = () => {
  const [institutions, setInstitutions] = useState<VerificationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState<VerificationSummary | null>(null);
  const [decision, setDecision] = useState<'verified' | 'rejected'>('verified');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadRecommendedQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.verifications.getRecommendedInstitutions();
      setInstitutions(data);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load recommended approval queue.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendedQueue();
  }, []);

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await api.verifications.approve(selectedInst.institution_id, decision, reason.trim());
      showToast({
        type: 'success',
        title: `Institution ${decision === 'verified' ? 'Approved' : 'Rejected'}`,
        message: `${selectedInst.name} status updated to ${decision}.`,
      });
      setSelectedInst(null);
      setReason('');
      loadRecommendedQueue();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Decision Error',
        message: err.message || 'Could not finalize approval decision.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-cream-200 pb-6">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
          Platform Governance
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">
          Final Administrative Approval Queue
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Step 2 of the two-step verification state machine. Grant verified status and wish posting privileges.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading recommended institutions..." />}

      {!isLoading && institutions.length === 0 && (
        <EmptyState
          title="No pending approvals"
          description="All recommended institutions have been processed. When field verifiers submit recommendations, they will appear here."
        />
      )}

      {!isLoading && institutions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {institutions.map((inst) => (
            <div
              key={inst.institution_id}
              className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                    Recommended by Field Verifier
                  </span>
                  <span className="font-mono text-xs text-ink-500">
                    #{inst.institution_id}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-ink-900">{inst.name}</h3>
                <p className="text-xs text-ink-600">
                  {inst.city}, {inst.state} &bull; Reg: <span className="font-mono">{inst.registration_number}</span>
                </p>

                {/* Verifier recommendation note */}
                {inst.recommendation && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <span className="font-bold block text-amber-900">
                      Field Verifier Findings:
                    </span>
                    <p className="italic leading-relaxed">&ldquo;{inst.recommendation.reason}&rdquo;</p>
                  </div>
                )}

                {/* Document Links */}
                <div>
                  <span className="text-[11px] font-bold text-ink-600 uppercase tracking-wider block mb-1">
                    Legal Proofs ({inst.documents.length})
                  </span>
                  <div className="space-y-1">
                    {inst.documents.map((doc) => (
                      <div key={doc.id} className="text-xs flex items-center justify-between bg-cream-50 p-2 rounded">
                        <span className="truncate max-w-[200px]">{doc.original_filename}</span>
                        {doc.sas_url && (
                          <a
                            href={doc.sas_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-terracotta-600 font-bold hover:underline"
                          >
                            Inspect PDF &rarr;
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-cream-100 flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedInst(inst);
                    setDecision('rejected');
                    setReason('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    setSelectedInst(inst);
                    setDecision('verified');
                    setReason('All premises inspection criteria satisfied. Government registration validated.');
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition"
                >
                  Approve Verification &check;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={selectedInst !== null}
        onClose={() => setSelectedInst(null)}
        title={decision === 'verified' ? 'Approve Institution Verification' : 'Reject Institution'}
        subtitle={`Institution: ${selectedInst?.name}`}
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <p className="text-xs text-ink-600 leading-relaxed">
            {decision === 'verified'
              ? 'Approving will grant this children\'s home the status "verified" and unlock the ability to post item wishes.'
              : 'Specify the administrative reason for declining.'}
          </p>

          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Decision Reason (Mandatory, min 5 chars)
            </label>
            <textarea
              required
              minLength={5}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3 border-t border-cream-200">
            <button
              type="button"
              onClick={() => setSelectedInst(null)}
              className="px-4 py-2 rounded-xl border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-soft transition disabled:opacity-50 ${
                decision === 'verified'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : decision === 'verified' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

