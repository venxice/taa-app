'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl bg-white px-3.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60 disabled:bg-slate-50';

const invalidRing = 'ring-red-300 focus:ring-red-500 bg-red-50/40';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, 'h-11', invalid && invalidRing, className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, 'py-2.5 min-h-[96px] resize-y', invalid && invalidRing, className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, invalid, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        'h-11 pr-9 appearance-none bg-no-repeat cursor-pointer',
        invalid && invalidRing,
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem',
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export function Label({
  children,
  required,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-slate-700 mb-1.5', className)}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
