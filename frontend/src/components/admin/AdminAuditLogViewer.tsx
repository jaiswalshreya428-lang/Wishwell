import React, { useState, useEffect } from 'react';
import { AuditLogRow, AuditVerificationResponse } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

export const AdminAuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);
  const { showToast } = useToast();

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const records = await api.admin.getAuditLogs(50, 0);
      setLogs(records);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not fetch audit log entries.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const result = await api.admin.verifyAuditChain();
      setVerificationResult(result);
      if (result.is_valid) {
        showToast({
          type: 'success',
          title: 'Chain Validated & Verified',
          message: `All ${result.total_records_checked} rows cryptographically verified with zero broken links.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Data Tampering Detected!',
          message: `Hash link broken at record #${result.tampered_row_id}.`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'Error occurred while verifying hash chain.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Integrity Check Button */}
      <div className="border-b border-cream-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-indigo-700 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Cryptographic Ledger</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">
            Append-Only Audit Log
          </h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Each record embeds the SHA-256 hash of its predecessor, creating an unbroken chain.
            Direct database UPDATE and DELETE queries are blocked by T-SQL triggers and user permissions.
          </p>
        </div>

        <div>
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-soft transition flex items-center space-x-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{isVerifying ? 'Computing SHA-256 Chaining...' : 'Verify Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-5 rounded-2xl border transition-all animate-in fade-in ${
            verificationResult.is_valid
              ? 'bg-sage-50 border-sage-300 text-sage-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start space-x-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                verificationResult.is_valid ? 'bg-sage-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {verificationResult.is_valid ? '&check;' : '!'}
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                {verificationResult.is_valid
                  ? 'Audit Log Integrity Intact — 100% Valid Chain'
                  : 'INTEGRITY BREACH DETECTED: Hash Mismatch Found!'}
              </h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {verificationResult.message} (Checked {verificationResult.total_records_checked} chronological rows).
              </p>
              {verificationResult.tampered_row_id && (
                <div className="font-mono text-xs bg-rose-100/70 p-2 rounded mt-2 border border-rose-200">
                  Culprit Row: #{verificationResult.tampered_row_id} &bull; Broken Link Index: #{verificationResult.broken_link_index}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      {isLoading && <LoadingSpinner label="Loading cryptographic ledger rows..." />}

      {!isLoading && logs.length === 0 && (
        <div className="text-center py-12 text-sm text-ink-500">
          No audit entries recorded yet.
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="bg-white rounded-3xl border border-cream-200 overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-700">
              <thead className="bg-cream-100/80 text-[11px] font-bold text-ink-500 uppercase tracking-wider border-b border-cream-200">
                <tr>
                  <th className="py-3.5 px-4">Row ID</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Status Shift</th>
                  <th className="py-3.5 px-4 font-mono">Prev Hash</th>
                  <th className="py-3.5 px-4 font-mono">Record Hash</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 font-feature-tabular">
                {logs.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-cream-50 cursor-pointer transition"
                    title="Click to inspect cryptographic payload"
                  >
                    <td className="py-3 px-4 font-bold text-ink-900 font-mono">#{row.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink-800">{row.entity_type}</span>{' '}
                      <span className="text-ink-400">#{row.entity_id}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-terracotta-700">{row.action}</td>
                    <td className="py-3 px-4 text-[11px]">
                      {row.old_status ? (
                        <span>
                          <span className="text-ink-400">{row.old_status}</span> &rarr;{' '}
                          <span className="font-bold text-ink-800">{row.new_status}</span>
                        </span>
                      ) : (
                        <span className="font-bold text-ink-800">{row.new_status || '—'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-ink-500 max-w-[120px] truncate">
                      {row.prev_hash ? `${row.prev_hash.slice(0, 10)}...` : 'GENESIS'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-indigo-700 font-semibold max-w-[120px] truncate">
                      {row.record_hash ? `${row.record_hash.slice(0, 10)}...` : '—'}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-ink-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail & Hash Inspection Modal */}
      <Modal
        isOpen={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        title={`Audit Record #${selectedRow?.id} Inspection`}
        subtitle={`${selectedRow?.entity_type} &bull; Action: ${selectedRow?.action}`}
      >
        {selectedRow && (
          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="font-sans font-bold text-ink-500 uppercase tracking-wider block text-[10px]">
                Event Details
              </span>
              <p className="font-sans text-xs text-ink-800 mt-1 bg-cream-50 p-2.5 rounded-lg border border-cream-200">
                {selectedRow.details || 'No additional details logged.'}
              </p>
            </div>

            <div>
              <span className="font-sans font-bold text-ink-500 uppercase tracking-wider block text-[10px]">
                Previous Row Hash (Pointer Link)
              </span>
              <p className="text-[11px] bg-cream-100 p-2.5 rounded-lg break-all text-ink-700 border border-cream-200 select-all mt-1">
                {selectedRow.prev_hash || '0'.repeat(64)}
              </p>
            </div>

            <div>
              <span className="font-sans font-bold text-indigo-700 uppercase tracking-wider block text-[10px]">
                SHA-256 Record Hash (Seal)
              </span>
              <p className="text-[11px] bg-indigo-50 text-indigo-900 p-2.5 rounded-lg break-all border border-indigo-200 select-all mt-1 font-bold">
                {selectedRow.record_hash}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 rounded-xl bg-cream-200 hover:bg-cream-300 font-sans text-xs font-bold text-ink-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

