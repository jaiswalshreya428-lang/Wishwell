import React, { useState } from 'react';
import { api } from '../../api/endpoints';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

interface SendThankYouModalProps {
  deliveryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendThankYouModal: React.FC<SendThankYouModalProps> = ({
  deliveryId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!deliveryId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await api.deliveries.createThankYou(deliveryId, message.trim());
      showToast({
        type: 'success',
        title: 'Thank-You Note Sent!',
        message: 'Your personal gratitude message was delivered directly to the donor.',
      });
      setMessage('');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Only one thank-you note is permitted per delivery.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send a Thank-You Note to the Donor"
      subtitle={`For Delivery #${deliveryId}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-ink-600 leading-relaxed">
          Write a heartfelt note thanking the donor for fulfilling this wish. Strictly one thank-you note is recorded per delivery.
        </p>

        <div>
          <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
            Thank-You Message
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dear Sarah, thank you so much for the 10 textbooks! The children are already using them in their afternoon study hall..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
          />
        </div>

        <div className="pt-2 flex justify-end space-x-3 border-t border-cream-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="px-5 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Note'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

