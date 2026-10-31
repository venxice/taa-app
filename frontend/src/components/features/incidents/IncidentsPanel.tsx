'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Plus,
  Pencil,
  MapPin,
  CalendarDays,
  Inbox,
  Eye,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { post, put } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/Field';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterPills } from '@/components/ui/FilterPills';
import { DateSortMenu } from '@/components/ui/DateSortMenu';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

interface Incident {
  id: string;
  incidentType: string;
  title: string;
  description: string;
  location: string;
  dateIncident: string;
  dateReported: string;
  status: string;
  remarks?: string | null;
  actionTaken?: string | null;
  respondentName?: string;
  involvedPerson?: string;
  reportedBy?: { firstName: string; lastName: string } | null;
  handledBy?: { firstName: string; lastName: string } | null;
}

const STATUSES = ['pending', 'investigating', 'resolved', 'rejected'] as const;

function IncidentStatus({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant={status} dot>{label}</Badge>
  );
}

const EMPTY_REPORT = {
  incidentType: '',
  title: '',
  description: '',
  location: '',
  dateIncident: new Date().toISOString().slice(0, 10),
  complainantName: '',
  complainantContact: '',
  respondentName: '',
  involvedPerson: '',
};

export function IncidentsPanel({ canManage = false }: { canManage?: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const params = new URLSearchParams({ sort: dateSort });
  if (statusFilter) params.set('status', statusFilter);
  const { data, loading, error, refetch } = useApi<{ incidents: Incident[] }>(
    `/incidents?${params.toString()}`,
    [statusFilter, dateSort]
  );

  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [viewing, setViewing] = useState<Incident | null>(null);
  const [statusForm, setStatusForm] = useState({ status: 'pending', remarks: '', actionTaken: '' });

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportForm.title || !reportForm.incidentType || !reportForm.description || !reportForm.location) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await post('/incidents', reportForm);
      toast.success('Incident reported');
      setReportOpen(false);
      setReportForm(EMPTY_REPORT);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to report incident'
      );
    } finally {
      setSaving(false);
    }
  }

  function openStatus(i: Incident) {
    setEditing(i);
    setStatusForm({ status: i.status, remarks: i.remarks || '', actionTaken: i.actionTaken || '' });
    setEditOpen(true);
  }

  async function handleStatusSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!statusForm.remarks.trim()) {
      toast.error('Add a reason or status update note');
      return;
    }
    setSaving(true);
    try {
      await put(`/incidents/${editing.id}`, statusForm);
      toast.success('Incident updated');
      setEditOpen(false);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Update failed'
      );
    } finally {
      setSaving(false);
    }
  }

  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        mobileRow
        icon={AlertTriangle}
        title={canManage ? 'Incidents' : 'My Incidents'}
        description={
          canManage
            ? 'Review and resolve incidents reported by residents'
            : 'Report and track incidents within the subdivision'
        }
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex sm:hidden"><DateSortMenu value={dateSort} onChange={setDateSort} compact /></span>
            <span className="hidden sm:inline-flex"><DateSortMenu value={dateSort} onChange={setDateSort} /></span>
            <Button
              onClick={() => setReportOpen(true)}
              aria-label="Report an incident"
              title="Report an incident"
              className="h-10 w-10 p-0 sm:h-11 sm:w-auto sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Report incident</span>
            </Button>
          </div>
        }
      />

      {canManage && (
        <FilterPills
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'All', value: '' },
            ...STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s as string })),
          ]}
        />
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-900/5">
          <SkeletonList rows={3} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-red-500 shadow-card ring-1 ring-slate-900/5">
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <EmptyState
            icon={Inbox}
            title="No incidents to show"
            description={canManage ? 'Nothing needs attention right now.' : 'You have not reported any incidents.'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((i) => (
            <article key={i.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-slide-up sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{i.title}</h3>
                    <IncidentStatus status={i.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle size={13} /> {i.incidentType}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {i.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} /> {formatDate(i.dateIncident)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setViewing(i)}
                    title="View incident details"
                    aria-label={`View details for ${i.title}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openStatus(i)}
                        title="Update status"
                        aria-label={`Update status for ${i.title}`}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{i.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {i.respondentName && (
                  <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                    Respondent: <strong className="text-slate-800">{i.respondentName}</strong>
                  </span>
                )}
                {i.remarks && (
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                    {i.status === 'rejected'
                      ? 'Rejection reason'
                      : i.status === 'resolved'
                        ? 'Resolution reason'
                        : 'Remarks'}: {i.remarks}
                  </span>
                )}
                {i.actionTaken && (
                  <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs text-teal-700">
                    Action: {i.actionTaken}
                  </span>
                )}
              </div>

              {canManage && i.reportedBy && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  Reported by {i.reportedBy.firstName} {i.reportedBy.lastName} on {formatDate(i.dateReported)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Full incident details */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Incident report'}
        description={
          viewing
            ? `${viewing.incidentType} · Reported ${formatDate(viewing.dateReported)}`
            : undefined
        }
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStatus status={viewing.status} />
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin size={14} /> {viewing.location}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays size={14} /> Incident date: {formatDate(viewing.dateIncident)}
              </span>
            </div>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">What happened</h4>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{viewing.description}</p>
            </section>

            {(viewing.respondentName || viewing.involvedPerson) && (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                {viewing.respondentName && (
                  <div>
                    <p className="text-xs text-slate-400">Respondent / suspect</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{viewing.respondentName}</p>
                  </div>
                )}
                {viewing.involvedPerson && (
                  <div>
                    <p className="text-xs text-slate-400">Other person involved</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{viewing.involvedPerson}</p>
                  </div>
                )}
              </div>
            )}

            {viewing.actionTaken && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Action taken</h4>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{viewing.actionTaken}</p>
              </section>
            )}
            {viewing.remarks && (
              <section className="rounded-xl border border-brand-100 bg-brand-50/70 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {viewing.status === 'rejected'
                    ? 'Reason for rejection'
                    : viewing.status === 'resolved'
                      ? 'Resolution reason'
                      : 'Remarks'}
                </h4>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{viewing.remarks}</p>
              </section>
            )}

            {canManage && viewing.reportedBy && (
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                Reported by {viewing.reportedBy.firstName} {viewing.reportedBy.lastName}
              </p>
            )}
            {viewing.handledBy && (
              <p className="text-xs text-slate-400">
                Updated by {viewing.handledBy.firstName} {viewing.handledBy.lastName}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Report modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report an Incident"
        description="Give as much detail as you can."
      >
        <form onSubmit={handleReport} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Incident Type" required>
              <Input
                value={reportForm.incidentType}
                onChange={(e) => setReportForm({ ...reportForm, incidentType: e.target.value })}
                placeholder="e.g. Theft, Noise, Fire"
              />
            </FormField>
            <FormField label="Date of Incident" required>
              <Input
                type="date"
                value={reportForm.dateIncident}
                onChange={(e) => setReportForm({ ...reportForm, dateIncident: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Title" required>
            <Input
              value={reportForm.title}
              onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
              placeholder="Short summary"
              maxLength={200}
            />
          </FormField>
          <FormField label="Location" required>
            <Input
              value={reportForm.location}
              onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
              placeholder="Block / street / landmark"
            />
          </FormField>
          <FormField label="Description" required>
            <Textarea
              value={reportForm.description}
              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              placeholder="What happened?"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Respondent / Suspect">
              <Input
                value={reportForm.respondentName}
                onChange={(e) => setReportForm({ ...reportForm, respondentName: e.target.value })}
              />
            </FormField>
            <FormField label="Other Person Involved">
              <Input
                value={reportForm.involvedPerson}
                onChange={(e) => setReportForm({ ...reportForm, involvedPerson: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status update modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Update Incident${editing ? `: ${editing.title}` : ''}`}
      >
        <form onSubmit={handleStatusSave} className="space-y-4">
          <FormField label="Status" required>
            <Select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Action Taken">
            <Textarea
              value={statusForm.actionTaken}
              onChange={(e) => setStatusForm({ ...statusForm, actionTaken: e.target.value })}
              placeholder="What did the HOA do?"
            />
          </FormField>
          <FormField
            label={
              statusForm.status === 'rejected'
                ? 'Reason for rejection'
                : statusForm.status === 'resolved'
                  ? 'Resolution reason'
                  : 'Reason / status update'
            }
            required
            hint={
              ['resolved', 'rejected'].includes(statusForm.status)
                ? 'This reason will be visible to the resident who reported it.'
                : 'Visible to the resident who reported it.'
            }
          >
            <Textarea
              required
              value={statusForm.remarks}
              onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
              placeholder={
                statusForm.status === 'rejected'
                  ? 'Explain why this report is being rejected'
                  : statusForm.status === 'resolved'
                    ? 'Explain how or why this report is resolved'
                    : 'Additional notes'
              }
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
