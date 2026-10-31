'use client';

/* eslint-disable @next/next/no-img-element -- uploaded photos use user-provided URLs */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Megaphone,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  MoreVertical,
  PenSquare,
  Search,
  X,
  ImagePlus,
  Image as ImageIcon,
  Loader2,
  Pin,
  FileText,
  Send,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { post, put, del, uploadFile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/Field';
import { Input, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterPills } from '@/components/ui/FilterPills';
import { DateSortMenu } from '@/components/ui/DateSortMenu';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/Dropdown';
import { timeAgo, fullName } from '@/lib/format';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  isPinned: boolean;
  imageUrl: string | null;
  createdAt: string;
  author?: { firstName: string; lastName: string; role?: string };
}

type Tab = 'feed' | 'drafts';

const EMPTY_FORM = {
  title: '',
  content: '',
  isPublished: false,
  imageUrl: null as string | null,
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function roleLabel(role?: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'hoa_officer') return 'HOA Officer';
  return null;
}

export function AnnouncementsPanel({ canManage = false }: { canManage?: boolean }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [target, setTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search typing → query
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Close lightbox with Escape + lock background scroll
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    params.set('published', canManage && tab === 'drafts' ? 'false' : 'true');
    params.set('sort', dateSort);
    if (search) params.set('search', search);
    return `/announcements?${params.toString()}`;
  }, [canManage, tab, search, dateSort]);

  const { data, loading, error, refetch } = useApi<{
    announcements: Announcement[];
    pagination?: { total: number };
  }>(listUrl);
  const { data: draftsData, refetch: refetchDrafts } = useApi<{ pagination: { total: number } }>(
    canManage ? '/announcements?published=false&limit=1' : null
  );
  const draftsTotal = draftsData?.pagination.total ?? 0;

  async function refetchAll() {
    await Promise.all([refetch(), refetchDrafts()]);
  }

  const canDelete = user?.role === 'admin';
  const meName = user ? `${user.firstName} ${user.lastName}` : '';

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      isPublished: a.isPublished,
      imageUrl: a.imageUrl,
    });
    setModalOpen(true);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setImageUploading(true);
    try {
      const res = await uploadFile<{ url: string }>('/announcements/upload', file, 'image');
      if (!res.success || !res.data?.url) throw new Error(res.message || 'Upload failed');
      setForm((f) => ({ ...f, imageUrl: res.data!.url }));
    } catch (err) {
      toast.error((err as Error).message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        isPublished: form.isPublished,
        imageUrl: form.imageUrl,
      };
      if (editing) {
        await put(`/announcements/${editing.id}`, payload);
        toast.success('Announcement updated');
      } else {
        await post('/announcements', payload);
        toast.success(form.isPublished ? 'Announcement posted' : 'Saved to drafts');
      }
      setModalOpen(false);
      await refetchAll();
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
      await del(`/announcements/${target.id}`);
      toast.success('Announcement deleted');
      setTarget(null);
      await refetchAll();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Delete failed'
      );
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublish(a: Announcement) {
    try {
      await put(`/announcements/${a.id}`, { isPublished: !a.isPublished });
      toast.success(a.isPublished ? 'Moved to drafts' : 'Published to the community');
      await refetchAll();
    } catch {
      toast.error('Failed to update');
    }
  }

  async function togglePin(a: Announcement) {
    try {
      await put(`/announcements/${a.id}`, { isPinned: !a.isPinned });
      toast.success(a.isPinned ? 'Unpinned' : 'Pinned to top of the feed');
      await refetchAll();
    } catch {
      toast.error('Failed to update');
    }
  }

  const announcements = data?.announcements ?? [];
  const total = data?.pagination?.total ?? announcements.length;
  const newestAnnouncement = announcements.reduce<Announcement | null>(
    (newest, item) =>
      !newest || new Date(item.createdAt) > new Date(newest.createdAt) ? item : newest,
    null
  );
  const emptyState = search ? (
    <EmptyState
      icon={Search}
      title="No matches found"
      description={`No announcements match "${search}".`}
    />
  ) : tab === 'drafts' ? (
    <EmptyState
      icon={FileText}
      title="No drafts"
      description="Posts you save as drafts will appear here until you publish them."
    />
  ) : (
    <EmptyState
      icon={Megaphone}
      title="No announcements yet"
      description={
        canManage
          ? 'Share your first announcement using the box above to keep residents informed.'
          : 'Community announcements will appear here once posted.'
      }
    />
  );

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {canManage ? (
        <PageHeader
          icon={Megaphone}
          title="Announcements"
          description="Post, pin and manage updates for the community."
        />
      ) : (
        <section className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/80 via-white to-white px-5 py-5 shadow-card sm:px-7 sm:py-6">
          <div className="relative flex items-start gap-3.5 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100 sm:h-12 sm:w-12">
              <Megaphone size={23} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700 sm:text-[11px]">
                Teremil Subdivision · HOA
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Community feed
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Neighborhood news, notices and updates—all in one place.
              </p>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-brand-200/70 pt-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">
              <Megaphone size={13} /> {loading ? 'Loading updates' : `${total} ${total === 1 ? 'update' : 'updates'}`}
            </span>
            {!loading && newestAnnouncement && (
              <span className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600">
                Latest {timeAgo(newestAnnouncement.createdAt)}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Composer (staff) */}
      {canManage && (
        <button
          onClick={openCreate}
          className="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card ring-1 ring-slate-900/5 transition hover:ring-brand-200"
        >
          <Avatar name={meName} size="md" />
          <span className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-400 transition group-hover:bg-slate-200">
            Share an announcement with the community…
          </span>
          <PenSquare size={18} className="text-brand-600" />
        </button>
      )}

      {/* Tabs (staff) / feed title (residents) + search */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:justify-start sm:gap-3">
          {canManage ? (
            <FilterPills<Tab>
              options={[
                { label: 'Feed', value: 'feed' },
                { label: draftsTotal > 0 ? `Drafts · ${draftsTotal}` : 'Drafts', value: 'drafts' },
              ]}
              value={tab}
              onChange={setTab}
              className="min-w-0 flex-1"
            />
          ) : (
            <h2 className="shrink-0 text-sm font-semibold text-slate-700">
              {search ? `Search results · ${total}` : 'Latest updates'}
            </h2>
          )}
          <DateSortMenu value={dateSort} onChange={setDateSort} compact />
        </div>

        <div className="relative w-36 shrink-0 sm:w-48">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search announcements"
            className="pl-9 pr-9"
            aria-label="Search announcements"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-900/5">
          <SkeletonList rows={3} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-red-500 shadow-card ring-1 ring-slate-900/5">
          {error}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">{emptyState}</div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const authorName = a.author ? fullName(a.author) : 'HOA Office';
            const role = roleLabel(a.author?.role) ?? (!canManage ? 'HOA Official' : null);
            const showFooter = canManage && tab === 'drafts';

            return (
              <article
                key={a.id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow animate-slide-up hover:shadow-soft sm:rounded-3xl"
              >
                {/* Post header */}
                <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
                  <Avatar name={authorName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                      {role && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                          {role}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                      <span>{timeAgo(a.createdAt)}</span>
                      {a.imageUrl && (
                        <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                          <ImageIcon size={12} aria-hidden="true" /> Photo attached
                        </span>
                      )}
                      {a.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(a)}
                      title="View full post"
                      aria-label={`View full post: ${a.title}`}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Eye size={18} />
                    </button>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Post options"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => togglePublish(a)}>
                            {a.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                            {a.isPublished ? 'Move to drafts' : 'Publish'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => togglePin(a)}>
                            <Pin size={16} /> {a.isPinned ? 'Unpin from top' : 'Pin to top'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(a)}>
                            <Pencil size={16} /> Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem danger onSelect={() => setTarget(a)}>
                                <Trash2 size={16} /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Post body */}
                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
                    {a.title}
                  </h3>
                  <p
                    className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-slate-600"
                  >
                    {a.content}
                  </p>
                </div>

                {/* Draft quick actions */}
                {showFooter && (
                  <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-5">
                    <Button
                      size="icon-sm"
                      onClick={() => togglePublish(a)}
                      title="Publish"
                      aria-label={`Publish ${a.title}`}
                    >
                      <Send size={15} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      onClick={() => openEdit(a)}
                      title="Edit"
                      aria-label={`Edit ${a.title}`}
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Full announcement */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Announcement'}
        description={
          viewing
            ? `${viewing.author ? fullName(viewing.author) : 'HOA Office'} · ${timeAgo(viewing.createdAt)}`
            : undefined
        }
      >
        {viewing && (
          <div className="space-y-4">
            {viewing.imageUrl && (
              <button
                type="button"
                onClick={() => setLightbox(viewing.imageUrl)}
                aria-label={`View full-size photo: ${viewing.title}`}
                className="flex max-h-[55dvh] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <img
                  src={viewing.imageUrl}
                  alt={viewing.title}
                  className="h-auto w-auto max-h-[calc(55dvh-1rem)] max-w-full object-contain"
                />
              </button>
            )}
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
              {viewing.content}
            </p>
          </div>
        )}
      </Modal>

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        description={
          editing
            ? 'Update this post for the community.'
            : 'Share a photo and update the community — publish now or keep as a draft.'
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Announcement title"
              maxLength={200}
            />
          </FormField>
          <FormField label="Content" required>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write the announcement…"
              className="min-h-[160px]"
              maxLength={10000}
            />
          </FormField>
          <FormField
            label="Photo"
            hint="Optional — JPG, PNG, WEBP or GIF up to 5 MB. Cropped to a uniform 16:9 size."
          >
            {form.imageUrl ? (
              <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
                <img
                  src={form.imageUrl}
                  alt="Announcement photo"
                  className="aspect-[16/9] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                  aria-label="Remove photo"
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={imageUploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700 disabled:opacity-60"
              >
                {imageUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus size={16} /> Add photo
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFile}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Publish immediately
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : form.isPublished ? 'Post Announcement' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 pt-16 animate-fade-in sm:p-6 sm:pt-16"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close image"
            className="absolute right-3 top-3 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:top-5"
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="Announcement"
            className="h-auto w-auto max-h-[calc(100dvh-5.5rem)] max-w-full rounded-lg object-contain shadow-lift sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete announcement?"
        description={`"${target?.title}" will be permanently removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
