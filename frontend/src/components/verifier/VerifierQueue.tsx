import React, { useState, useEffect } from 'react';
import { VerificationSummary } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

export const VerifierQueue: React.FC = () => {
  const [institutions, setInstitutions] = useState<VerificationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState<VerificationSummary | null>(null);
  const [actionType, setActionType] = useState<'recommend' | 'reject'>('recommend');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadPendingQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.verifications.getPendingInstitutions();
      setInstitutions(data);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load pending verification queue.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingQueue();
  }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'recommend') {
        await api.verifications.recommend(selectedInst.institution_id, reason.trim());
        showToast({
          type: 'success',
          title: 'Institution Recommended',
          message: `${selectedInst.name} recommended. Forwarded to Admin Approval Queue.`,
        });
      } else {
        await api.verifications.approve(selectedInst.institution_id, 'rejected', reason.trim());
        showToast({
          type: 'info',
          title: 'Application Rejected',
          message: `${selectedInst.name} has been rejected with documented reason.`,
        });
      }
      setSelectedInst(null);
      setReason('');
      loadPendingQueue();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not complete verification recommendation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-cream-200 pb-6">
        <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
          Field Verifier Portal
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">Pending Field Verifications</h1>
        <p className="text-sm text-ink-600 mt-1">
          Review legal registration proofs, inspect premises compliance, and document physical inspection recommendations.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading pending verification requests..." />}

      {!isLoading && institutions.length === 0 && (
        <EmptyState
          title="No pending inspections"
          description="The verification queue is clear. When new children's homes register, they will appear here for field review."
        />
      )}

      {!isLoading && institutions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {institutions.map((inst) => (
            <div
              key={inst.institution_id}
              className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono bg-cream-100 text-ink-600 px-2 py-0.5 rounded">
                    Reg: {inst.registration_number}
                  </span>
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Pending Inspection
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-ink-900">{inst.name}</h3>
                <p className="text-xs text-ink-600">Location: {inst.city}, {inst.state}</p>

                {/* Uploaded Documents List */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-ink-700 uppercase tracking-wider block mb-1">
                    Uploaded Documents ({inst.documents.length})
                  </span>
                  {inst.documents.length === 0 ? (
                    <span className="text-xs text-ink-400 italic">No documents attached yet</span>
                  ) : (
                    <div className="space-y-1.5">
                      {inst.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-cream-50 p-2 rounded-lg text-xs"
                        >
                          <span className="truncate max-w-[200px] font-medium text-ink-800">
                            {doc.original_filename}
                          </span>
                          {doc.sas_url ? (
                            <a
                              href={doc.sas_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-terracotta-600 hover:text-terracotta-800 font-bold ml-2 shrink-0"
                            >
                              View PDF / Doc &rarr;
                            </a>
                          ) : (
                            <span className="text-ink-400">Vaulted</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-cream-100 flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedInst(inst);
                    setActionType('reject');
                    setReason('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    setSelectedInst(inst);
                    setActionType('recommend');
                    setReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-soft transition"
                >
                  Recommend for Approval &rarr;
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
        title={actionType === 'recommend' ? 'Recommend Institution' : 'Reject Institution'}
        subtitle={`Institution: ${selectedInst?.name}`}
      >
        <form onSubmit={handleAction} className="space-y-4">
          <p className="text-xs text-ink-600 leading-relaxed">
            {actionType === 'recommend'
              ? 'Document your physical inspection findings. This reason will be reviewed by the Administrator before final platform approval.'
              : 'Specify the reason for declining this institution (e.g., premises mismatch, unverified registration).'}
          </p>

          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Inspection Findings & Reason (Mandatory, min 5 chars)
            </label>
            <textarea
              required
              minLength={5}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === 'recommend'
                  ? 'Visited premises on 28th Oct. Inspected dormitories and dining hall. 42 children housed. Registration certificate verified with state registry.'
                  : 'Premises address could not be verified; registration certificate expired in 2024.'
              }
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
                actionType === 'recommend'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting
                ? 'Submitting Decision...'
                : actionType === 'recommend'
                ? 'Submit Recommendation'
                : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

