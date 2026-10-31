'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'danger' | 'brand';
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex h-full flex-col justify-center">
        <div className="flex gap-4">
          <div
            className={
              tone === 'danger'
                ? 'h-11 w-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0'
                : 'h-11 w-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0'
            }
          >
            <AlertTriangle size={22} />
          </div>
          <div className="text-sm text-slate-600 pt-1.5">
            {description || 'This action cannot be undone.'}
            {children}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
