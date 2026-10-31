'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex h-[min(90dvh,48rem)] w-full min-h-0 flex-col overflow-hidden bg-white shadow-lift sm:h-[min(42rem,85dvh)] sm:max-w-xl',
          'rounded-t-3xl sm:rounded-2xl animate-slide-up sm:animate-scale-in',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-4 sm:px-6">{footer}</div>
        )}
      </div>
    </div>
  );
}
