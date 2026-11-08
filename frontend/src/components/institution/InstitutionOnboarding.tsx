import React, { useState, useEffect } from 'react';
import { Institution } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

export const InstitutionOnboarding: React.FC<{ onCreateWish: () => void }> = ({
  onCreateWish,
}) => {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('registration_certificate');
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await api.verifications.getMyInstitution();
      setInstitution(data);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load your institution profile.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Client-side file size check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Verification documents must be under 5 MB.',
      });
      return;
    }

    setIsUploading(true);
    try {
      await api.verifications.uploadDocument(file, docType);
      showToast({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Stored securely in private blob storage.',
      });
      setFile(null);
      loadProfile();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload document.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitVerification = async () => {
    try {
      await api.verifications.submitForVerification();
      showToast({
        type: 'success',
        title: 'Submitted for Verification',
        message: 'A field verifier has been assigned to review your documents and conduct physical inspection.',
      });
      loadProfile();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Unable to submit for verification.',
      });
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading institution verification status..." />;
  if (!institution) return null;

  const isVerified = institution.status === 'verified';

  // 4-step state machine tracker
  const steps = [
    { title: 'Registration & Docs', desc: 'Profile and legal proofs uploaded', done: true },
    {
      title: 'Field Verification',
      desc: 'Physical inspection & recommendation by verifier',
      done: institution.status === 'recommended' || institution.status === 'verified',
    },
    {
      title: 'Admin Approval',
      desc: 'Final platform validation & approval',
      done: institution.status === 'verified',
    },
    {
      title: 'Posting Privileges',
      desc: 'Eligible to post item wishes for children',
      done: institution.status === 'verified',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Title & Status */}
      <div className="border-b border-cream-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
            Institution Onboarding
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">
            {institution.name}
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Reg. No: <span className="font-mono">{institution.registration_number}</span> &bull; {institution.city}, {institution.state}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={institution.status} size="md" />
          {isVerified && (
            <button
              onClick={onCreateWish}
              className="px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition"
            >
              + Create New Wish
            </button>
          )}
        </div>
      </div>

      {/* 4-Step Verification Tracker */}
      <div className="bg-white rounded-2xl border border-cream-200 p-6 sm:p-8 shadow-soft">
        <h3 className="font-serif text-lg font-bold text-ink-900 mb-6">Verification State Tracker</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done
                      ? 'bg-sage-600 text-white'
                      : 'bg-cream-200 text-ink-500'
                  }`}
                >
                  {step.done ? '&check;' : idx + 1}
                </span>
                <span className="font-bold text-sm text-ink-900">{step.title}</span>
              </div>
              <p className="text-xs text-ink-600 pl-10 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Document Upload & Status Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft space-y-4">
          <h3 className="font-serif text-lg font-bold text-ink-900">Upload Verification Document</h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Upload government registration certificate, FCRA license, or physical premises lease (PDF, PNG, JPG up to 5 MB). Files are stored in private Azurite Blob Storage and served only via short-lived SAS tokens.
          </p>

          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              >
                <option value="registration_certificate">Government Registration Certificate</option>
                <option value="tax_exemption_12a">Tax Exemption / 12A / 80G Certificate</option>
                <option value="premises_inspection">Premises Lease / Physical Property Proof</option>
                <option value="director_id">Director Official Government ID</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Select File (PDF, PNG, JPG &le; 5 MB)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-ink-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cream-200 file:text-ink-800 hover:file:bg-cream-300 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
            >
              {isUploading ? 'Validating & Uploading...' : 'Upload Document to Private Vault'}
            </button>
          </form>
        </div>

        {/* Current State Explanation */}
        <div className="bg-cream-100/60 rounded-2xl border border-cream-200 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-ink-900">Current Status: {institution.status.toUpperCase()}</h3>
            {institution.status === 'pending' && (
              <p className="text-xs text-ink-700 leading-relaxed">
                Your profile is currently awaiting field verification. A verified inspector will contact you to perform physical verification of your premises. You may upload additional documents above.
              </p>
            )}
            {institution.status === 'recommended' && (
              <p className="text-xs text-ink-700 leading-relaxed">
                A field verifier has successfully inspected your home and recommended your institution! Final administrative approval is currently pending.
              </p>
            )}
            {institution.status === 'verified' && (
              <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 text-sage-900 text-xs space-y-1">
                <span className="font-bold block">&check; Fully Verified Institution</span>
                <p>Your home has been approved by the platform administrator. You can now post specific wish requests for your children.</p>
              </div>
            )}
            {institution.status === 'rejected' && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                Verification was declined. Please check with support or re-upload valid government documentation.
              </div>
            )}
          </div>

          {institution.status === 'pending' && (
            <button
              onClick={handleSubmitVerification}
              className="w-full py-2.5 rounded-xl bg-white border border-cream-300 hover:bg-cream-200 text-ink-800 text-xs font-bold transition shadow-soft-sm"
            >
              Request Field Verifier Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

