import React, { useState } from 'react';
import { Delivery } from '../../types';
import { api } from '../../api/endpoints';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { SuccessBurst } from '../atmosphere/SuccessBurst';

interface ConfirmDeliveryModalProps {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfirmDeliveryModal: React.FC<ConfirmDeliveryModalProps> = ({
  delivery,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast } = useToast();

  if (!delivery) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    setIsSubmitting(true);
    try {
      await api.deliveries.confirmReceipt(delivery.id, photo);
      showToast({
        type: 'success',
        title: 'Delivery Confirmed!',
        message: 'Photo proof verified, EXIF stripped, and stored securely. Donor notified.',
      });
      setIsSuccess(true);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: err.message || 'Could not verify delivery receipt photo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Item Delivery Receipt"
      subtitle={`Delivery #${delivery.id} &bull; Claim #${delivery.wish_claim_id}`}
    >
      {isSuccess ? (
        <div className="py-8 flex items-center justify-center">
          <SuccessBurst
            message="Delivery Confirmed & EXIF Metadata Stripped!"
            onComplete={() => {
              setIsSuccess(false);
              onSuccess();
              onClose();
            }}
          />
        </div>
      ) : (
      <form onSubmit={handleConfirm} className="space-y-6">
        {/* Child Privacy Warning */}
        <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 text-sage-900 text-xs space-y-1.5 leading-relaxed">
          <div className="flex items-center space-x-1.5 font-bold text-sage-800">
            <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Strict Privacy Rule: Items Only, Zero Children</span>
          </div>
          <p>
            Please photograph <strong>only the received boxes, items, books, or unpacked supplies</strong> on a table or shelf.
            Never photograph children. All EXIF metadata and GPS tags will be stripped automatically before storage.
          </p>
        </div>

        {/* Tracking info if present */}
        {delivery.tracking_number && (
          <div className="text-xs text-ink-600 bg-cream-100 p-3 rounded-lg">
            <span className="font-semibold text-ink-800">Courier / Tracking info:</span>{' '}
            {delivery.tracking_number}
          </div>
        )}

        {/* Photo Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider">
            Upload Item Photo (JPEG / PNG &le; 5 MB)
          </label>
          <input
            type="file"
            required
            accept="image/jpeg,image/png,image/jpg"
            onChange={handlePhotoChange}
            className="w-full text-xs text-ink-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cream-200 file:text-ink-800 hover:file:bg-cream-300 cursor-pointer"
          />
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Item Photo Preview
            </span>
            <div className="relative rounded-xl overflow-hidden border border-cream-200 max-h-48 bg-cream-100">
              <img
                src={previewUrl}
                alt="Item proof preview"
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 flex items-center justify-end space-x-3 border-t border-cream-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-ink-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!photo || isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying & Stripping EXIF...' : 'Confirm Items Received'}
          </button>
        </div>
      </form>
      )}
    </Modal>
  );
};

