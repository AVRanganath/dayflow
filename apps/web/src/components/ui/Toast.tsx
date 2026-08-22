'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ duration = 4000, ...toast }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast],
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast],
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast],
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast],
  );

  const typeConfig: Record<
    ToastType,
    { icon: React.ReactNode; container: string; text: string }
  > = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      container: 'border-[#A7F3D0] bg-[#ECFDF5]',
      text: 'text-[#065F46]',
    },
    error: {
      icon: <AlertCircle className="h-5 w-5 text-danger" />,
      container: 'border-[#FECACA] bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
      container: 'border-[#FDE68A] bg-[#FFFBEB]',
      text: 'text-[#92400E]',
    },
    info: {
      icon: <Info className="h-5 w-5 text-secondary" />,
      container: 'border-[#BCE1E3] bg-[#F0F9FA]',
      text: 'text-[#01686D]',
    },
  };

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((toast) => {
          const cfg = typeConfig[toast.type];
          return (
            <div
              key={toast.id}
              className={clsx(
                'pointer-events-auto flex items-start gap-3 rounded-card border p-3.5 shadow-lg transition-all duration-200 animate-in slide-in-from-right',
                cfg.container,
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className={clsx('text-xs font-bold', cfg.text)}>
                    {toast.title}
                  </h4>
                )}
                <p className={clsx('text-xs leading-relaxed', cfg.text)}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
