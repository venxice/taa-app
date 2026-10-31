import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Teremil logo mark. */
export function Logo({
  size = 40,
  className,
  chip = false,
}: {
  size?: number;
  className?: string;
  chip?: boolean;
}) {
  const img = (
    <Image
      src="/logo.png"
      alt="Teremil Subdivision logo"
      width={size}
      height={size}
      unoptimized
      priority
      className="object-contain"
    />
  );

  if (!chip) return <span className={cn('inline-block', className)}>{img}</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Teremil Subdivision logo"
        width={size - 8}
        height={size - 8}
        unoptimized
        priority
        className="object-contain"
      />
    </span>
  );
}

/** Logo + wordmark lockup. */
export function Brand({
  size = 40,
  chip = false,
  subtitle = 'Teremil Subdivision',
  className,
  textClassName,
}: {
  size?: number;
  chip?: boolean;
  subtitle?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo size={size} chip={chip} />
      <div className="leading-tight">
        <p className={cn('font-bold tracking-tight', textClassName)}>TAA-App</p>
        <p className={cn('text-xs', textClassName ? `${textClassName} opacity-80` : 'text-slate-500')}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
