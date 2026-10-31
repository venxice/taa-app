'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import {
  Save,
  Home,
  Phone,
  BadgeCheck,
  Check,
  Pencil,
  Eye,
  EyeOff,
  UserCircle,
} from 'lucide-react';
import { put } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/Field';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Resident } from '@shared/types';
import { PageHeader } from '@/components/ui/PageHeader';

type FormState = Record<string, string | boolean>;

interface FieldDef {
  key: string;
  label: string;
  type?: string;
  full?: boolean;
  options?: string[];
}

interface SectionDef {
  key: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  fields?: FieldDef[];
}

interface Tile {
  label: string;
  value: string;
  full?: boolean;
  wrap?: boolean;
}

const HOUSEHOLD_ROLES = ['House Owner', 'Tenant', 'Relative', 'Boarder', 'Caretaker', 'Other'];

const HOUSEHOLD_SECTIONS: SectionDef[] = [
  {
    key: 'household',
    title: 'Address & Household',
    desc: 'Where you live and your role at home',
    icon: Home,
    fields: [
      { key: 'address', label: 'Home Address', type: 'textarea', full: true },
      { key: 'householdRole', label: 'Role in the household', type: 'select', options: HOUSEHOLD_ROLES },
      { key: 'householdSize', label: 'Household size', type: 'number' },
    ],
  },
];

const EMERGENCY_SECTIONS: SectionDef[] = [
  {
    key: 'contact',
    title: 'Emergency Contact',
    desc: 'Who we should contact in an emergency',
    icon: Phone,
    fields: [
      { key: 'emergencyContactName', label: 'Emergency Contact Name' },
      { key: 'emergencyContactPhone', label: 'Emergency Contact Number', type: 'tel' },
      { key: 'emergencyContactRelation', label: 'Relationship' },
    ],
  },
];

const SECTIONS: SectionDef[] = [...HOUSEHOLD_SECTIONS, ...EMERGENCY_SECTIONS];

const BOOL_FIELDS: { key: string; label: string }[] = [
  { key: 'isSenior', label: 'Senior Citizen' },
  { key: 'isPWD', label: 'PWD' },
  { key: 'isVoter', label: 'Registered Voter' },
];

const TEXT_FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields ?? []);

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'hoa_officer':
      return 'HOA Officer';
    case 'resident':
      return 'Resident';
    default:
      return 'Member';
  }
}

function statusDotClass(status?: string) {
  switch (status) {
    case 'verified':
      return 'bg-emerald-300';
    case 'pending':
    case 'investigating':
      return 'bg-amber-300';
    case 'rejected':
    case 'suspended':
    case 'disabled':
      return 'bg-rose-300';
    default:
      return 'bg-slate-300';
  }
}

function statusTextClass(status?: string) {
  if (status === 'verified') return 'text-brand-700';
  if (status === 'pending' || status === 'investigating') return 'text-amber-700';
  if (status === 'rejected' || status === 'suspended' || status === 'disabled') return 'text-red-700';
  return 'text-slate-600';
}

function buildInitial(resident: Resident | null | undefined): FormState {
  const initial: FormState = {};
  for (const f of TEXT_FIELDS) {
    const raw = (resident as unknown as FormState | undefined)?.[f.key];
    initial[f.key] = String(raw ?? '');
  }
  for (const f of BOOL_FIELDS) initial[f.key] = Boolean((resident as unknown as FormState | undefined)?.[f.key]);
  return initial;
}

/* ============================================================
   Change Password — available to every role
   ============================================================ */
function ChangePasswordCard() {
  const { logout } = useAuth();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  function set(key: 'current' | 'next' | 'confirm', value: string) {
    setPw((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!pw.current) errs.current = 'Enter your current password';
    if (!pw.next) errs.next = 'Enter a new password';
    else if (pw.next.length < 8) errs.next = 'Must be at least 8 characters';
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords do not match';
    if (errs.current || errs.next || errs.confirm) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await put('/auth/change-password', {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      toast.success('Password changed. Please sign in again.');
      setPw({ current: '', next: '', confirm: '' });
      await logout();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Change failed'
      );
    } finally {
      setSaving(false);
    }
  }

  const ready = pw.current && pw.next && pw.confirm;

  const eyeBtn = (key: 'current' | 'next' | 'confirm') => (
    <button
      type="button"
      onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
      aria-label={visible[key] ? 'Hide password' : 'Show password'}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      {visible[key] ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5 animate-slide-up"
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">Change Password</h2>
          <p className="text-xs text-slate-400">Keep your account secure</p>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 sm:px-5 sm:py-3">
        <div className="sm:col-span-2">
          <FormField label="Current password" error={errors.current}>
            <div className="relative">
              <Input
                type={visible.current ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                value={pw.current}
                onChange={(e) => set('current', e.target.value)}
              />
              {eyeBtn('current')}
            </div>
          </FormField>
        </div>
        <FormField label="New password" error={errors.next} hint="At least 8 characters">
          <div className="relative">
            <Input
              type={visible.next ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-10"
              value={pw.next}
              onChange={(e) => set('next', e.target.value)}
            />
            {eyeBtn('next')}
          </div>
        </FormField>
        <FormField label="Confirm new password" error={errors.confirm}>
          <div className="relative">
            <Input
              type={visible.confirm ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-10"
              value={pw.confirm}
              onChange={(e) => set('confirm', e.target.value)}
            />
            {eyeBtn('confirm')}
          </div>
        </FormField>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
        <Button type="submit" loading={saving} disabled={!ready}>
          <Save size={16} /> Update Password
        </Button>
      </div>
    </form>
  );
}

/* ============================================================
   Profile panel — shared by resident / officer / admin
   ============================================================ */
export function ProfilePanel() {
  const { user, refreshUser } = useAuth();

  const residentRec = user?.resident ?? null;
  const hasResident = !!residentRec;

  const [form, setForm] = useState<FormState>(() => buildInitial(residentRec));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Household / emergency edit modals
  const [modal, setModal] = useState<'household' | 'emergency' | null>(null);

  // Edit account details (username / email / phone) modal
  const [acctOpen, setAcctOpen] = useState(false);
  const [acct, setAcct] = useState({ username: '', email: '', phone: '' });
  const [acctSaving, setAcctSaving] = useState(false);

  function openAccount() {
    setAcct({
      username: user?.username ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
    setAcctOpen(true);
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (acct.username.trim().length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    setAcctSaving(true);
    try {
      await put('/users/me', {
        username: acct.username.trim(),
        email: acct.email.trim(),
        phone: acct.phone.trim(),
      });
      toast.success('Account updated');
      setAcctOpen(false);
      await refreshUser();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Update failed'
      );
    } finally {
      setAcctSaving(false);
    }
  }

  useEffect(() => {
    setForm(buildInitial(user?.resident));
    setDirty(false);
  }, [user]);

  // Warn before losing unsaved edits on tab close / navigation
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function openModal(which: 'household' | 'emergency') {
    setForm(buildInitial(user?.resident));
    setDirty(false);
    setModal(which);
  }

  function closeModal() {
    if (dirty) setForm(buildInitial(user?.resident));
    setDirty(false);
    setModal(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of TEXT_FIELDS) {
        if (f.key === 'householdSize') {
          if (form.householdSize !== '' && form.householdSize !== undefined)
            payload.householdSize = Number(form.householdSize);
          continue;
        }
        payload[f.key] = String(form[f.key] ?? '');
      }
      for (const f of BOOL_FIELDS) payload[f.key] = Boolean(form[f.key]);
      await put('/residents/me', payload);
      toast.success('Profile updated');
      setDirty(false);
      setModal(null);
      await refreshUser();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'
      );
    } finally {
      setSaving(false);
    }
  }

  function renderField(f: FieldDef) {
    const value = String(form[f.key] ?? '');
    return (
      <div key={f.key} className={f.full ? 'sm:col-span-2' : undefined}>
        <FormField label={f.label}>
          {f.type === 'textarea' ? (
            <Textarea value={value} rows={3} onChange={(e) => update(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <Select value={value} onChange={(e) => update(f.key, e.target.value)}>
              <option value="">Select…</option>
              {f.options &&
                (value && !f.options.includes(value) ? [value, ...f.options] : f.options).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
            </Select>
          ) : (
            <Input
              type={f.type || 'text'}
              inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
              value={value}
              onChange={(e) => update(f.key, e.target.value)}
            />
          )}
        </FormField>
      </div>
    );
  }

  function renderSections(sections: SectionDef[], withBenefits: boolean) {
    return (
      <>
        {sections.map((s) => (
          <section
            key={s.key}
            className="rounded-xl bg-slate-50/70 p-4 ring-1 ring-inset ring-slate-900/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-inset ring-slate-900/5">
                <s.icon size={15} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="truncate text-xs text-slate-400">{s.desc}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">{s.fields?.map(renderField)}</div>
          </section>
        ))}

        {withBenefits && (
          <section className="rounded-xl bg-slate-50/70 p-4 ring-1 ring-inset ring-slate-900/5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-inset ring-slate-900/5">
                <BadgeCheck size={15} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Benefits &amp; Status</h3>
                <p className="truncate text-xs text-slate-400">Check all that apply</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {BOOL_FIELDS.map((f) => {
                const checked = Boolean(form[f.key]);
                return (
                  <label
                    key={f.key}
                    className={cn(
                      'flex cursor-pointer select-none items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus-within:ring-2 focus-within:ring-brand-500 active:scale-[0.98]',
                      checked
                        ? 'border-brand-600 font-medium text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) => update(f.key, e.target.checked)}
                    />
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                        checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                      )}
                    >
                      {checked && <Check size={13} strokeWidth={3} />}
                    </span>
                    {f.label}
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </>
    );
  }

  const name = user ? `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}` : '';

  const accountItems = [
    { label: 'Username', value: user?.username || '—' },
    { label: 'Email', value: user?.email || '—' },
    { label: 'Phone', value: user?.phone || '—' },
    { label: 'Member since', value: user?.createdAt ? formatDate(user.createdAt) : '—' },
  ];

  const disp = (v: unknown) =>
    v === undefined || v === null || String(v).trim() === '' ? '—' : String(v);

  const householdItems: Tile[] = [
    { label: 'Home Address', value: disp(residentRec?.address), full: true, wrap: true },
    { label: 'Role in household', value: disp(residentRec?.householdRole) },
    { label: 'Household size', value: disp(residentRec?.householdSize) },
  ];

  const emergencyItems: Tile[] = [
    { label: 'Emergency contact', value: disp(residentRec?.emergencyContactName) },
    {
      label: 'Emergency contact number',
      value: disp(residentRec?.emergencyContactPhone),
    },
    { label: 'Relationship', value: disp(residentRec?.emergencyContactRelation) },
  ];

  const benefits = BOOL_FIELDS.filter((f) => Boolean(residentRec?.[f.key as 'isSenior' | 'isPWD' | 'isVoter']));

  function tileCard(opts: {
    title: string;
    items: Tile[];
    aria: string;
    onEdit: () => void;
    grid: string;
    footer?: React.ReactNode;
  }) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{opts.title}</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={opts.onEdit}
            aria-label={opts.aria}
            className="shrink-0"
          >
            <Pencil size={14} /> Edit
          </Button>
        </div>
        <dl className={cn('grid grid-cols-1 gap-4', opts.grid)}>
          {opts.items.map((item) => (
            <div key={item.label} className={cn('min-w-0', item.full && 'sm:col-span-2')}>
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
              <dd
                className={cn(
                  'mt-0.5 text-sm font-medium text-slate-800',
                  item.wrap ? 'break-words' : 'truncate'
                )}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {opts.footer}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={UserCircle} title="My Profile" description="View and update your account, household, and emergency contact details." />
      {/* ============ Identity hero ============ */}
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
          <Avatar name={name} size="xl" className="h-20 w-20 text-2xl ring-4 ring-brand-50" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{name}</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">@{user?.username}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
                {roleLabel(user?.role)}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium capitalize', statusTextClass(user?.status))}>
                <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(user?.status))} />
                {user?.status?.replace(/_/g, ' ')}
              </span>
              {user?.createdAt && (
                <span className="text-[11px] font-medium text-slate-400">
                  Member since {formatDate(user.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Account information ============ */}
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Account information</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={openAccount}
            aria-label="Edit account information"
            className="shrink-0"
          >
            <Pencil size={14} /> Edit
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accountItems.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ============ Household + Emergency cards ============ */}
      {hasResident && (
        <>
          {tileCard({
            title: 'Household information',
            items: householdItems,
            aria: 'Edit household information',
            onEdit: () => openModal('household'),
            grid: 'sm:grid-cols-2 lg:grid-cols-4',
            footer: (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <span className="mr-1 text-[11px] uppercase tracking-wide text-slate-400">
                  Benefits
                </span>
                {benefits.length === 0 ? (
                  <span className="text-sm text-slate-400">None declared</span>
                ) : (
                  benefits.map((f) => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-200"
                    >
                      <Check size={11} strokeWidth={3} /> {f.label}
                    </span>
                  ))
                )}
              </div>
            ),
          })}
          {tileCard({
            title: 'Emergency contact',
            items: emergencyItems,
            aria: 'Edit emergency contact information',
            onEdit: () => openModal('emergency'),
            grid: 'sm:grid-cols-2 lg:grid-cols-3',
          })}
        </>
      )}

      {/* ============ Change password ============ */}
      <ChangePasswordCard />

      {/* Edit account details modal */}
      <Modal
        open={acctOpen}
        onClose={() => setAcctOpen(false)}
        title="Edit Account Information"
        description="Update your login details."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setAcctOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="account-form"
              loading={acctSaving}
              disabled={!acct.username.trim()}
            >
              <Save size={16} /> Save Changes
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={saveAccount} className="space-y-4">
          <FormField label="Username" required hint="At least 3 characters">
            <Input
              value={acct.username}
              autoComplete="username"
              onChange={(e) => setAcct({ ...acct, username: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={acct.email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => setAcct({ ...acct, email: e.target.value })}
            />
          </FormField>
          <FormField label="Contact Number">
            <Input
              type="tel"
              inputMode="tel"
              value={acct.phone}
              autoComplete="tel"
              onChange={(e) => setAcct({ ...acct, phone: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>

      {/* Edit household modal */}
      <Modal
        open={modal === 'household'}
        onClose={closeModal}
        title="Edit Household Information"
        description="Update your address and household details."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="household-form" loading={saving} disabled={!dirty}>
              <Save size={16} /> Save Changes
            </Button>
          </>
        }
      >
        <form id="household-form" onSubmit={handleSave} className="space-y-5">
          {renderSections(HOUSEHOLD_SECTIONS, true)}
        </form>
      </Modal>

      {/* Edit emergency contact modal */}
      <Modal
        open={modal === 'emergency'}
        onClose={closeModal}
        title="Edit Emergency Contact"
        description="Who we should reach in case of an emergency."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="emergency-form" loading={saving} disabled={!dirty}>
              <Save size={16} /> Save Changes
            </Button>
          </>
        }
      >
        <form id="emergency-form" onSubmit={handleSave} className="space-y-5">
          {renderSections(EMERGENCY_SECTIONS, false)}
        </form>
      </Modal>
    </div>
  );
}
