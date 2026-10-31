'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from './Input';

/** Labeled field wrapper for forms, with optional inline error message. */
export function FormField({
  label,
  required,
  children,
  hint,
  error,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <div>
      <Label required={required} htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>
      )}
    </div>
  );
}
