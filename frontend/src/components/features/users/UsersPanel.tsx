'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  Search,
  Check,
  X,
  Pause,
  UserCheck,
  UserX,
  Power,
  Settings2,
  Eye,
  MoreHorizontal,
  AlertCircle,
  IdCard,
  Home,
  User,
  Users,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { get, post, put } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/Field';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { FilterPills } from '@/components/ui/FilterPills';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/format';

interface UserRow {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string | null;
  username: string;
  role: string;
  status: string;
  phone?: string;
  avatar?: string | null;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

interface ResidentProfile {
  birthDate?: string | null;
  birthPlace?: string | null;
  age?: number | null;
  gender?: string | null;
  civilStatus?: string | null;
  religion?: string | null;
  nationality?: string | null;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  occupation?: string | null;
  employerName?: string | null;
  bloodType?: string | null;
  houseNumber?: string | null;
  street?: string | null;
  purok?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  zipCode?: string | null;
  address?: string | null;
  householdRole?: string | null;
  householdSize?: number | null;
  fatherName?: string | null;
  motherName?: string | null;
  guardian?: string | null;
  guardianPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  pwdInfo?: string | null;
  isSenior?: boolean;
  isPWD?: boolean;
  isSingleParent?: boolean;
  isVoter?: boolean;
  is4Ps?: boolean;
  isWRA?: boolean;
}

function userRoleLabel(role: string) {
  if (role === 'hoa_officer') return 'HOA Officer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

interface UserDetails extends UserRow {
  resident?: ResidentProfile | null;
}

interface DetailItem {
  label: string;
  value?: string | number | null;
  full?: boolean;
}

/** Label/value cell that hides itself when the value is empty. */
function Detail({ label, value, full }: DetailItem) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={full ? 'col-span-2' : 'min-w-0'}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium leading-snug text-slate-800">{value}</dd>
    </div>
  );
}

/** Small icon chip + title used for each block of details. */
function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <Icon size={14} />
      </span>
      <h4 className="text-[13px] font-semibold text-slate-900">{children}</h4>
    </div>
  );
}

/** Avatar, name and badges — kept outside the scrolling body in the Verify modal. */
function UserDetailsHeader({ u }: { u: UserDetails }) {
  const name = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ');
  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">{name}</p>
          <p className="truncate text-sm text-slate-500">@{u.username}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">{userRoleLabel(u.role)}</span>
        <Badge variant={u.status} dot>
          {u.status}
        </Badge>
      </div>
    </div>
  );
}

/** Grouped, readable fields of the account + resident profile. */
function UserDetailsSections({ u }: { u: UserDetails }) {
  const r = u.resident;
  const address = (r?.address ?? '').trim()
    ? (r!.address as string)
    : [r?.houseNumber, r?.street, r?.purok, r?.barangay, r?.municipality, r?.zipCode]
        .filter((x) => x && String(x).trim())
        .join(', ');
  const flags = [
    r?.isSenior && 'Senior citizen',
    r?.isPWD && `PWD${r.pwdInfo ? ` (${r.pwdInfo})` : ''}`,
    r?.isSingleParent && 'Single parent',
    r?.isVoter && 'Registered voter',
    r?.is4Ps && '4Ps beneficiary',
    r?.isWRA && 'WRA',
  ].filter((f): f is string => Boolean(f));

  const hasReason =
    !!u.rejectionReason && ['rejected', 'suspended', 'disabled'].includes(u.status);
  const reasonLabel =
    u.status === 'suspended' ? 'Suspension reason' : u.status === 'disabled' ? 'Disabled note' : 'Rejection reason';
  const reasonTone =
    u.status === 'suspended'
      ? 'bg-amber-50 text-amber-800 ring-amber-200/70'
      : u.status === 'disabled'
        ? 'bg-slate-100 text-slate-600 ring-slate-200'
        : 'bg-red-50 text-red-700 ring-red-200/70';

  const sections: { title: string; icon: LucideIcon; items: DetailItem[] }[] = [
    {
      title: 'Account',
      icon: IdCard,
      items: [
        { label: 'Email', value: u.email || r?.email },
        { label: 'Contact number', value: u.phone || r?.phone },
        { label: 'Registered', value: formatDate(u.createdAt) },
        { label: 'Verified', value: u.verifiedAt ? formatDate(u.verifiedAt) : undefined },
      ],
    },
    ...(r
      ? [
          {
            title: 'Address & household',
            icon: Home,
            items: [
              { label: 'Address', value: address || undefined, full: true },
              { label: 'Role in household', value: r.householdRole },
              { label: 'Household size', value: r.householdSize != null ? r.householdSize : undefined },
            ] as DetailItem[],
          },
          {
            title: 'Personal details',
            icon: User,
            items: [
              { label: 'Birth date', value: r.birthDate ? formatDate(r.birthDate) : undefined },
              { label: 'Birth place', value: r.birthPlace },
              { label: 'Age', value: r.age },
              { label: 'Gender', value: r.gender },
              { label: 'Civil status', value: r.civilStatus },
              { label: 'Nationality', value: r.nationality },
              { label: 'Religion', value: r.religion },
              { label: 'Nickname / alias', value: r.alias },
              { label: 'Blood type', value: r.bloodType },
              { label: 'Occupation', value: r.occupation },
              { label: 'Employer', value: r.employerName },
            ] as DetailItem[],
          },
          {
            title: 'Family & emergency',
            icon: Users,
            items: [
              { label: "Father's name", value: r.fatherName },
              { label: "Mother's name", value: r.motherName },
              { label: 'Guardian', value: r.guardian },
              { label: 'Guardian phone', value: r.guardianPhone },
              { label: 'Emergency contact', value: r.emergencyContactName },
              { label: 'Emergency number', value: r.emergencyContactPhone },
              { label: 'Relationship', value: r.emergencyContactRelation },
            ] as DetailItem[],
          },
        ]
      : []),
  ].filter((s) =>
    s.items.some((i) => i.value !== undefined && i.value !== null && i.value !== ''),
  );

  return (
    <div>
      {hasReason && (
        <div className={cn('mb-5 flex items-start gap-2.5 rounded-xl p-3.5 ring-1', reasonTone)}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">{reasonLabel}</p>
            <p className="mt-0.5 break-words text-[13px] leading-snug">{u.rejectionReason}</p>
          </div>
        </div>
      )}
      {sections.map((s, i) => (
        <section key={s.title} className={i === 0 ? undefined : 'mt-5 border-t border-slate-100 pt-5'}>
          <SectionTitle icon={s.icon}>{s.title}</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            {s.items.map((it) => (
              <Detail key={it.label} {...it} />
            ))}
          </dl>
        </section>
      ))}
      {flags.length > 0 && (
        <section className="mt-5 border-t border-slate-100 pt-5">
          <SectionTitle icon={BadgeCheck}>Benefits &amp; status</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100"
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Full account + resident profile of a user, shown in the View and Verify modals. */
function UserDetailsBody({ u, showHeader = true }: { u: UserDetails; showHeader?: boolean }) {
  return (
    <div>
      {showHeader && (
        <div className="border-b border-slate-100 pb-5">
          <UserDetailsHeader u={u} />
        </div>
      )}
      <div className={showHeader ? 'pt-5' : undefined}>
        <UserDetailsSections u={u} />
      </div>
    </div>
  );
}

const ROLES = ['resident', 'hoa_officer', 'admin'] as const;
const STATUS_OPTIONS = ['', 'pending', 'verified', 'rejected', 'suspended', 'disabled'];

// Compact icon button with a portal-rendered tooltip (so table overflow
// never clips it). Used for the always-available "View" action.
const ICON_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-95';
const KEBAB_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-95';

function IconBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function showTip() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showTip}
        onMouseLeave={() => setPos(null)}
        onFocus={showTip}
        onBlur={() => setPos(null)}
        aria-label={label}
        className={ICON_BTN}
      >
        <Icon size={16} strokeWidth={2.25} />
      </button>
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-[9999] rounded-md bg-slate-900 px-2 py-1 text-center text-[11px] font-medium leading-tight text-white shadow-lg"
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
}

export function UsersPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const qs = new URLSearchParams();
  if (query) qs.set('search', query);
  if (statusFilter) qs.set('status', statusFilter);
  qs.set('limit', '50');

  const { data, loading, error, refetch } = useApi<{ users: UserRow[] }>(
    `/users?${qs.toString()}`,
    [query, statusFilter]
  );

  const [verifyTarget, setVerifyTarget] = useState<UserRow | null>(null);
  const [verifyMode, setVerifyMode] = useState<'verified' | 'rejected' | 'suspended'>('verified');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<string>('resident');

  const [disableTarget, setDisableTarget] = useState<UserRow | null>(null);
  const [disabling, setDisabling] = useState(false);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search.trim());
  }

  function openVerify(u: UserRow, mode: 'verified' | 'rejected' | 'suspended') {
    setVerifyTarget(u);
    setVerifyMode(mode);
    setReason('');
    void fetchDetails(u);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyTarget) return;
    if (verifyMode === 'rejected' && !reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setSaving(true);
    try {
      await post(`/users/${verifyTarget.id}/verify`, {
        status: verifyMode,
        rejectionReason: reason.trim() || undefined,
      });
      toast.success(
        verifyMode === 'verified' ? 'User verified' : verifyMode === 'rejected' ? 'User rejected' : 'User suspended'
      );
      setVerifyTarget(null);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed'
      );
    } finally {
      setSaving(false);
    }
  }

  function openRole(u: UserRow) {
    setRoleTarget(u);
    setNewRole(u.role);
  }

  async function handleRoleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTarget) return;
    setSaving(true);
    try {
      await put(`/users/${roleTarget.id}`, { role: newRole });
      toast.success('Role updated');
      setRoleTarget(null);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!disableTarget) return;
    setDisabling(true);
    try {
      await post(`/users/${disableTarget.id}/disable`);
      toast.success('Account disabled — they can no longer sign in');
      setDisableTarget(null);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Disable failed'
      );
    } finally {
      setDisabling(false);
    }
  }

  async function handleEnable(u: UserRow) {
    try {
      await post(`/users/${u.id}/enable`);
      toast.success('Account re-enabled');
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Enable failed'
      );
    }
  }

  const [viewTarget, setViewTarget] = useState<UserRow | null>(null);
  const [viewData, setViewData] = useState<UserDetails | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  async function fetchDetails(u: UserRow) {
    setViewData(null);
    setViewLoading(true);
    try {
      const res = await get<{ user: UserDetails }>(`/users/${u.id}`);
      setViewData(res.data?.user ?? null);
    } catch {
      setViewData(u as UserDetails);
    } finally {
      setViewLoading(false);
    }
  }

  async function openView(u: UserRow) {
    setViewTarget(u);
    await fetchDetails(u);
  }

  function menuItems(u: UserRow) {
    const isSelf = u.id === me?.id;
    type Item = { icon: LucideIcon; label: string; cls?: string; danger?: boolean; run: () => void };
    const items: Item[] = [];

    if (u.status === 'pending') {
      items.push({ icon: Check, label: 'Verify account', cls: 'text-brand-600', run: () => openVerify(u, 'verified') });
      items.push({ icon: X, label: 'Reject registration', cls: 'text-red-500', danger: true, run: () => openVerify(u, 'rejected') });
    }
    if (u.status === 'verified' && !isSelf) {
      items.push({ icon: Pause, label: 'Suspend account', cls: 'text-amber-500', run: () => openVerify(u, 'suspended') });
      if (me?.role === 'admin') items.push({ icon: UserX, label: 'Disable account', cls: 'text-red-500', danger: true, run: () => setDisableTarget(u) });
    }
    if (u.status === 'suspended' || u.status === 'rejected') {
      items.push({ icon: UserCheck, label: 'Reinstate account', cls: 'text-brand-600', run: () => openVerify(u, 'verified') });
    }
    if (u.status === 'disabled' && me?.role === 'admin') {
      items.push({ icon: Power, label: 'Re-enable account', cls: 'text-brand-600', run: () => handleEnable(u) });
    }
    if (me?.role === 'admin') {
      items.push({ icon: Settings2, label: 'Change role', run: () => openRole(u) });
    }

    return items;
  }

  function renderActions(u: UserRow) {
    const actions = menuItems(u);
    return (
      <>
        <IconBtn icon={Eye} label="View details" onClick={() => openView(u)} />
        {actions.length > 0 && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More actions" className={KEBAB_BTN}>
              <MoreHorizontal size={16} strokeWidth={2.25} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[13rem]">
            {actions.map((it) => (
              <DropdownMenuItem key={it.label} danger={it.danger} onSelect={it.run}>
                <it.icon size={15} strokeWidth={2.25} className={it.cls ?? 'text-slate-400'} />
                {it.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>}
      </>
    );
  }

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title={isAdmin ? 'User Management' : 'User Verification'}
        description={isAdmin ? 'Review resident accounts, verification status, and user roles.' : 'Review resident registrations and account verification.'}
        action={<form onSubmit={applySearch} className="relative w-full sm:w-72"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username" className="pl-10" aria-label="Search users by name or username" /></form>}
      />

      <FilterPills
        value={statusFilter}
        onChange={setStatusFilter}
        options={STATUS_OPTIONS.map((s) => ({
          value: s,
          label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All',
        }))}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
        {loading ? (
          <div className="p-6">
            <SkeletonList rows={4} />
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search or filter." />
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {users.map((u) => (
                <li key={u.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={`${u.firstName} ${u.lastName}`} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">@{u.username}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600">{userRoleLabel(u.role)}</span>
                        <Badge variant={u.status} dot>
                          {u.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="-mt-0.5 flex shrink-0 items-center gap-1.5">{renderActions(u)}</div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-slate-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-slate-600">{userRoleLabel(u.role)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.status} dot>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {renderActions(u)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Verify modal */}
      <Modal
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title={`${verifyMode === 'verified' ? 'Verify' : verifyMode === 'rejected' ? 'Reject' : 'Suspend'} User`}
      >
        <form onSubmit={handleVerify} className="space-y-4">
          {viewLoading || !viewData ? (
            <SkeletonList rows={3} />
          ) : (
            <div className="space-y-4">
              <UserDetailsHeader u={viewData} />
              <div className="max-h-[42vh] overflow-y-auto overscroll-contain rounded-xl bg-slate-50/60 px-4 py-4 ring-1 ring-slate-100">
                <UserDetailsSections u={viewData} />
              </div>
            </div>
          )}
          {verifyMode !== 'verified' && (
            <FormField label="Reason" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  verifyMode === 'rejected'
                    ? 'Why is this registration rejected?'
                    : 'Why is this account suspended?'
                }
              />
            </FormField>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} variant={verifyMode === 'verified' ? 'primary' : 'danger'}>
              {verifyMode === 'verified' ? 'Verify User' : verifyMode === 'rejected' ? 'Reject User' : 'Suspend User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role modal */}
      {me?.role === 'admin' && <Modal open={!!roleTarget} onClose={() => setRoleTarget(null)} title="Change Role">
        <form onSubmit={handleRoleSave} className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">
              {roleTarget?.firstName} {roleTarget?.lastName}
            </strong>{' '}
            (@{roleTarget?.username})
          </p>
          <FormField label="Role" required>
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Role
            </Button>
          </div>
        </form>
      </Modal>}

      {/* Disable confirm */}
      <ConfirmDialog
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={handleDisable}
        loading={disabling}
        title="Disable this account?"
        description={`@${disableTarget?.username} will no longer be able to sign in. You can re-enable the account anytime.`}
        confirmLabel="Disable"
      />

      {/* User details */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="User details"
        footer={
          <Button type="button" variant="secondary" onClick={() => setViewTarget(null)}>
            Close
          </Button>
        }
      >
        {viewLoading || !viewData ? (
          <SkeletonList rows={4} />
        ) : (
          <UserDetailsBody u={viewData} />
        )}
      </Modal>
    </div>
  );
}
