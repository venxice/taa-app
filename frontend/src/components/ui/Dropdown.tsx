'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = 'end',
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[12rem] overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-slate-900/5',
          'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-in origin-top',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  danger,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps & { inset?: boolean; danger?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors',
        inset && 'pl-9',
        danger
          ? 'text-red-600 data-[highlighted]:bg-red-50'
          : 'text-slate-700 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator className={cn('my-1 h-px bg-slate-100', className)} {...props} />
  );
}

export { Check as DropdownCheck, ChevronRight as DropdownChevron };
