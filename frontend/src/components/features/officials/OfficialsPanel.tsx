'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Pencil, Trash2, Phone, Mail, CalendarDays, Search } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { post, put, del } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { FilterPills } from '@/components/ui/FilterPills';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';

interface Official {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  position: string;
  positionOrder: number;
  termFrom?: string | null;
  termTo?: string | null;
  isActive: boolean;
  contactNumber?: string;
  email?: string;
}

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  position: '',
  positionOrder: '0',
  isActive: true,
  contactNumber: '',
  email: '',
  termFrom: '',
  termTo: '',
};

export function OfficialsPanel({ canManage = false }: { canManage?: boolean }) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params = new URLSearchParams();
  if (statusFilter === 'active') params.set('active', 'true');
  if (statusFilter === 'inactive') params.set('active', 'false');
  if (query) params.set('search', query);
  const qsStr = params.toString();
  const { data, loading, error, refetch } = useApi<{ officials: Official[] }>(
    `/officials${qsStr ? `?${qsStr}` : ''}`,
    [statusFilter, query]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Official | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<Official | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = user?.role === 'admin';

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(o: Official) {
    setEditing(o);
    setForm({
      firstName: o.firstName,
      middleName: o.middleName || '',
      lastName: o.lastName,
      position: o.position,
      positionOrder: String(o.positionOrder),
      isActive: o.isActive,
      contactNumber: o.contactNumber || '',
      email: o.email || '',
      termFrom: o.termFrom ? o.termFrom.slice(0, 10) : '',
      termTo: o.termTo ? o.termTo.slice(0, 10) : '',
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.position) {
      toast.error('First name, last name and position are required');
      return;
    }
    const payload = {
      ...form,
      positionOrder: Number(form.positionOrder) || 0,
      termFrom: form.termFrom || null,
      termTo: form.termTo || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await put(`/officials/${editing.id}`, payload);
        toast.success('Official updated');
      } else {
        await post('/officials', payload);
        toast.success('Official added');
      }
      setModalOpen(false);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Save failed'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      await del(`/officials/${target.id}`);
      toast.success('Official removed');
      setTarget(null);
      await refetch();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const officials = data?.officials ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        mobileRow
        icon={Users}
        title={canManage ? 'Officials' : 'HOA Officials'}
        description={canManage ? 'Manage the current Homeowners’ Association officers.' : 'Meet the current Homeowners’ Association officers.'}
        action={canManage && (
            <Button
              type="button"
              onClick={openCreate}
              className="h-10 w-10 shrink-0 p-0 sm:h-11 sm:w-auto sm:px-4"
              aria-label="Add official"
              title="Add official"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Official</span>
            </Button>
          )}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
        className="relative w-full sm:max-w-sm"
      >
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search officials by name or role"
          className="pl-10"
          aria-label="Search officials by name or position"
        />
      </form>

      {/* Status filters */}
      {canManage && (
        <FilterPills
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'Active', value: 'active' as const },
            { label: 'Inactive', value: 'inactive' as const },
            { label: 'All', value: 'all' as const },
          ]}
        />
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-900/5">
          <SkeletonList rows={2} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-red-500 shadow-card ring-1 ring-slate-900/5">
          {error}
        </div>
      ) : officials.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <EmptyState icon={Users} title="No officials found" description="HOA officers will appear here." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {officials.map((o) => {
            const name = [o.firstName, o.middleName, o.lastName].filter(Boolean).join(' ');
            return (
              <div
                key={o.id}
                className="group relative flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 transition hover:shadow-soft animate-slide-up"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Avatar name={name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-snug text-slate-900">
                      {name}
                      {o.suffix ? `, ${o.suffix}` : ''}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-brand-700">{o.position}</p>
                  </div>
                </div>

                {/* Info — one stacked row per line */}
                {(o.termFrom || o.contactNumber || o.email) && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-[13px] text-slate-500">
                    {o.termFrom && (
                      <div className="flex items-start gap-2.5">
                        <CalendarDays size={15} className="mt-px shrink-0 text-slate-400" />
                        <span className="leading-snug">
                          {formatDate(o.termFrom)} – {o.termTo ? formatDate(o.termTo) : 'Present'}
                        </span>
                      </div>
                    )}
                    {o.contactNumber && (
                      <div className="flex items-start gap-2.5">
                        <Phone size={15} className="mt-px shrink-0 text-slate-400" />
                        <span className="leading-snug">{o.contactNumber}</span>
                      </div>
                    )}
                    {o.email && (
                      <div className="flex items-start gap-2.5">
                        <Mail size={15} className="mt-px shrink-0 text-slate-400" />
                        <span className="break-all leading-snug">{o.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                {canManage && (
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                    <Badge variant={o.isActive ? 'verified' : 'suspended'} dot>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <button
                        onClick={() => openEdit(o)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setTarget(o)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Official' : 'Add Official'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First Name" required>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </FormField>
            <FormField label="Last Name" required>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Middle Name">
              <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
            </FormField>
            <FormField label="Position" required>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="e.g. President"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Order">
              <Input
                type="number"
                min="0"
                value={form.positionOrder}
                onChange={(e) => setForm({ ...form, positionOrder: e.target.value })}
              />
            </FormField>
            <FormField label="Term From">
              <Input
                type="date"
                value={form.termFrom}
                onChange={(e) => setForm({ ...form, termFrom: e.target.value })}
              />
            </FormField>
            <FormField label="Term To">
              <Input type="date" value={form.termTo} onChange={(e) => setForm({ ...form, termTo: e.target.value })} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contact Number">
              <Input
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Active (currently serving)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Add Official'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove official?"
        description={`${target?.firstName} ${target?.lastName} will be removed from the officials list.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
