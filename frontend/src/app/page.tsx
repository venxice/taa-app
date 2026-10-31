import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Check,
  CreditCard,
  Megaphone,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const FEATURES = [
  {
    icon: Megaphone,
    title: 'Announcements Feed',
    description: 'Stay updated with HOA notices in a clean, scrollable feed.',
  },
  {
    icon: TriangleAlert,
    title: 'Incident Reports',
    description: 'Report concerns and track their resolution status end to end.',
  },
  {
    icon: CreditCard,
    title: 'Payments & Dues',
    description: 'View dues, submit proof of payment, and track confirmation.',
  },
  {
    icon: Users,
    title: 'Officials Directory',
    description: 'Know your HOA officers and their contact information.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Residents',
    description: 'HOA-verified accounts keep the community secure and trusted.',
  },
  {
    icon: Bell,
    title: 'Always Informed',
    description: 'One place for community updates, requests, and records.',
  },
];

const STEPS = [
  'Register your household account',
  'Wait for HOA verification',
  'Access announcements, payments & more',
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={32} chip />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight sm:text-base">TAA-App</p>
              <p className="text-[10px] text-slate-400 sm:text-[11px]">Teremil Subdivision</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex sm:px-4"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800 sm:inline-flex"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50/70 via-white to-white" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-7 px-5 pb-6 pt-5 sm:px-6 sm:gap-10 lg:grid-cols-2 lg:py-16">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100 sm:px-3 sm:py-1">
              <Check size={13} /> Community portal for residents &amp; HOA
            </span>

            <h1 className="mt-3 text-[1.875rem] font-bold leading-[1.12] tracking-tight sm:mt-4 sm:text-5xl">
              Your subdivision,
              <span className="text-brand-700"> all in one place.</span>
            </h1>

            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-600 sm:mt-4 sm:text-lg">
              Teremil Assistance Application brings announcements, incident reports, payments, and
              HOA officials together — simple, transparent, and secure for the whole community.
            </p>

            <div className="mt-5 hidden flex-wrap items-center gap-2.5 sm:flex">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-base font-medium text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.995]"
              >
                Create Account <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
              {STEPS.map((step, i) => (
                <span key={step} className="inline-flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 sm:h-6 sm:w-6 sm:text-xs">
                    {i + 1}
                  </span>
                  {step}
                </span>
              ))}
            </div>
          </div>

          {/* Preview feed card */}
          <div className="relative mx-auto w-full max-w-sm animate-scale-in sm:max-w-md">
            <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-tr from-brand-100/60 to-transparent blur-2xl sm:-inset-4" />
            <div className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-lift sm:rounded-3xl sm:p-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Logo size={34} chip />
                <div>
                  <p className="text-sm font-semibold">Community Feed</p>
                  <p className="text-[11px] text-slate-400">Teremil Homeowners’ Association</p>
                </div>
              </div>
              <div className="space-y-2.5 pt-3 sm:space-y-3">
                {[
                  { t: 'Water interruption notice', d: 'Scheduled maintenance on Saturday, 8AM–12NN.' },
                  { t: 'Monthly dues reminder', d: 'Payments for this month are now open.' },
                  { t: 'Street light repaired', d: 'Report from Block 3 has been resolved.' },
                ].map((item) => (
                  <div
                    key={item.t}
                    className="rounded-xl border border-slate-100 p-2.5 transition hover:bg-slate-50 sm:rounded-2xl sm:p-3"
                  >
                    <p className="text-sm font-medium">{item.t}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-1 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
            Everything your community needs
          </h2>
          <p className="mt-2 text-[14px] text-slate-600 sm:mt-3 sm:text-base">
            Built around how the Teremil HOA actually works — from verification to collections.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:-translate-y-1 hover:shadow-soft sm:p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 sm:h-10 sm:w-10 sm:rounded-xl">
                <f.icon size={17} />
              </span>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">{f.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 sm:mt-1 sm:text-sm">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 pb-24 sm:pb-10 lg:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-7 text-center sm:px-6 sm:py-8">
          <Logo size={36} chip />
          <p className="text-xs text-slate-500 sm:text-sm">
            TAA-App © {new Date().getFullYear()} — Teremil Subdivision Assistance System
          </p>
        </div>
      </footer>

      {/* Sticky mobile actions */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <Link
            href="/register"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.99]"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
