import Link from 'next/link';
import { ArrowLeft, Megaphone, CreditCard, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-400/20 blur-2xl" />

        <Link href="/" className="relative flex items-center gap-3">
          <Logo size={48} chip />
          <div className="leading-tight text-white">
            <p className="font-bold tracking-tight">TAA-App</p>
            <p className="text-xs text-brand-100">Teremil Subdivision</p>
          </div>
        </Link>

        <div className="relative text-white">
          <h2 className="text-3xl font-bold leading-snug tracking-tight">
            One secure hub for our community.
          </h2>
          <p className="mt-3 max-w-md text-brand-100">
            Announcements, incident reports, payments, and officials — organized and accessible for
            every verified resident.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Megaphone, text: 'Community announcements feed' },
              { icon: CreditCard, text: 'Transparent dues & payment tracking' },
              { icon: ShieldCheck, text: 'HOA-verified residents only' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <f.icon size={16} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          © {new Date().getFullYear()} Teremil Homeowners’ Association
        </p>
      </aside>

      {/* Form column */}
      <div className="relative min-h-screen lg:flex lg:min-h-0 lg:flex-col">
        {/* Desktop top bar */}
        <div className="hidden px-10 py-6 lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>

        {/* Mobile brand header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-5 pb-14 pt-5 lg:hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={36} chip />
              <div className="leading-tight text-white">
                <p className="text-[15px] font-bold tracking-tight">TAA-App</p>
                <p className="text-[11px] text-brand-100">Teremil Subdivision</p>
              </div>
            </Link>
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </header>

        {/* Form sheet */}
        <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pb-10 pt-7 sm:px-8 lg:mt-0 lg:justify-center lg:rounded-none lg:px-10 lg:pb-8 lg:pt-0">
          <div className="mx-auto w-full max-w-md animate-slide-up lg:rounded-2xl lg:bg-white lg:p-8 lg:shadow-card lg:ring-1 lg:ring-slate-900/5">
            {children}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 lg:mt-10">
            Teremil Assistance Application — for residents &amp; HOA officers
          </p>
        </div>
      </div>
    </div>
  );
}
