import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../../context/ToastContext';

export const DonorNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.deliveries.getNotifications();
      setNotifications(data);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not fetch notifications.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.deliveries.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Graceful ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-cream-200 pb-4">
        <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
          Activity Center
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">Notifications & Notes</h1>
        <p className="text-sm text-ink-600 mt-1">
          Stay updated on your item deliveries, status confirmations, and thank-you messages from homes.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Fetching your notifications..." />}

      {!isLoading && notifications.length === 0 && (
        <EmptyState
          title="All Caught Up!"
          description="You don't have any notifications right now. Activity regarding your pledged wishes will appear here."
        />
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkAsRead(n.id)}
              className={`p-5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                !n.is_read
                  ? 'bg-cream-100/80 border-terracotta-200 shadow-soft'
                  : 'bg-white border-cream-200 opacity-80'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                {!n.is_read ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500 mt-1.5 shrink-0" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-cream-300 mt-1.5 shrink-0" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-ink-900">{n.title}</h4>
                    <span className="text-[10px] font-semibold text-ink-500 uppercase px-2 py-0.5 rounded bg-cream-200">
                      {n.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-ink-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-ink-400 font-feature-tabular block pt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-800 shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

