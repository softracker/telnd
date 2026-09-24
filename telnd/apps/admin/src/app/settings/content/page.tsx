'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/lib/auth-context';
import Toast, { type ToastType } from '@/components/toast';
import type { TranslationKey } from '@/lib/translations';
import ImageUploader from '@/components/image-uploader';
import { EditIcon, DeleteIcon, ConfirmIcon } from '@/components/action-icons';

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageFormState {
  id?: string;
  title: string;
  slug: string;
  isPublished: boolean;
}

interface TeamMember {
  id: string;
  photo: string;
  name: string;
  position: string;
  bio: string;
  email: string;
  linkedin: string;
  visible: boolean;
}

const emptyMember: Omit<TeamMember, 'id'> = {
  photo: '',
  name: '',
  position: '',
  bio: '',
  email: '',
  linkedin: '',
  visible: true,
};

// Core pages that get their own card — edit-only, no add/delete.
const STATIC_SLUGS = ['about-us', 'privacy-policy', 'terms-and-conditions'];

// Rows per page for both server-side lists (Our Team + Custom Pages).
const PAGE_SIZE = 5;

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      style={{ animation: 'spin 0.7s linear infinite' }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.8" />
    </svg>
  );
}

// Shared DataTables-style pager for the two server-side lists (5 rows a page).
function ListPager({
  page,
  totalPages,
  filteredTotal,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  filteredTotal: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  if (filteredTotal <= 0) return null;
  const prevDisabled = page <= 1 || loading;
  const nextDisabled = page >= totalPages || loading;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--muted-text)',
      }}
    >
      <span>
        {t('account.showingRange', {
          start: (page - 1) * PAGE_SIZE + 1,
          end: Math.min(page * PAGE_SIZE, filteredTotal),
          total: filteredTotal,
        })}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
          style={{
            ...pagerBtnStyle,
            opacity: prevDisabled ? 0.45 : 1,
            cursor: prevDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {t('common.prev')}
        </button>
        <span style={{ whiteSpace: 'nowrap' }}>
          {t('account.pageOf', { page, total: totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
          style={{
            ...pagerBtnStyle,
            opacity: nextDisabled ? 0.45 : 1,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}

const moveBtnStyle: React.CSSProperties = {
  background: 'var(--secondary-btn-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '5px',
  width: 20,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-main)',
  padding: 0,
};

const pagerBtnStyle: React.CSSProperties = {
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--secondary-btn-bg)',
  color: 'var(--text-main)',
  fontSize: '0.75rem',
  fontWeight: 600,
};

export default function ContentSettingsPage() {
  const { t } = useLanguage();
  const { can } = useAuth();

  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PageFormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Two-step confirm for member deletion, separate from the page one so an
  // armed page delete and an armed member delete can't interfere.
  const [pendingMemberDelete, setPendingMemberDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  const loadPages = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: ContentPage[] }>('/api/pages/admin');
      setPages(res.data || []);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) {
        showToast('error', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (can('content.view')) {
      void loadPages();
    } else {
      setLoading(false);
    }
  }, [can, loadPages]);

  // ── Our Team (website content, stored under the `team` settings key) ──
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [memberForm, setMemberForm] = useState<(Omit<TeamMember, 'id'> & { id?: string }) | null>(null);
  // True while the member photo is uploading — submit stays disabled until it
  // finishes (or fails), so a member can't be saved mid-upload without its photo.
  const [memberPhotoUploading, setMemberPhotoUploading] = useState(false);

  // The member form renders as a modal — lock body scroll and allow Escape to
  // close it while it's open.
  const memberFormOpen = memberForm !== null;
  useEffect(() => {
    if (!memberFormOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMemberForm();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberFormOpen]);

  // Server-side search + pagination for the member list (DataTables-style,
  // 5 rows per page). The full list still lives in `members` — it's the
  // baseline every mutation (reorder/toggle/delete/save) writes back.
  const [searchInput, setSearchInput] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamPage, setTeamPage] = useState(1);
  const [teamRows, setTeamRows] = useState<TeamMember[]>([]);
  const [teamMeta, setTeamMeta] = useState({ page: 1, totalPages: 1, filteredTotal: 0, total: 0 });
  const [teamRowsLoading, setTeamRowsLoading] = useState(true);

  // Debounce the search box; a new query always restarts at page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setTeamSearch(searchInput.trim());
      setTeamPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Same server-side search + pagination state for the Custom Pages table.
  const [pagesSearchInput, setPagesSearchInput] = useState('');
  const [pagesSearch, setPagesSearch] = useState('');
  const [pagesPage, setPagesPage] = useState(1);
  const [pageRows, setPageRows] = useState<ContentPage[]>([]);
  const [pageMeta, setPageMeta] = useState({ page: 1, totalPages: 1, filteredTotal: 0, total: 0 });
  const [pageRowsLoading, setPageRowsLoading] = useState(true);

  // Debounce the pages search box; a new query always restarts at page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setPagesSearch(pagesSearchInput.trim());
      setPagesPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [pagesSearchInput]);

  // Baseline of the last persisted team state — used to clean up superseded photos.
  const savedPhotosRef = useRef<Set<string>>(new Set());
  // Every photo uploaded during this visit; anything not saved by the time the
  // page is left gets deleted so it can't orphan in the bucket.
  const sessionUploadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        const team = res.data.team as { members?: TeamMember[] } | undefined;
        const loaded = Array.isArray(team?.members) ? team!.members! : [];
        setMembers(loaded);
        savedPhotosRef.current = new Set(loaded.map((m) => m.photo).filter(Boolean));
      } catch (err) {
        if (err instanceof ApiError && err.status !== 403) {
          showToast('error', err.message);
        }
      } finally {
        setLoadingTeam(false);
      }
    }
    if (can('team.view')) {
      void load();
    } else {
      setLoadingTeam(false);
    }
  }, [can, showToast]);

  function deleteImage(url: string) {
    api.delete('/api/upload/image', { url }).catch((err) => {
      console.warn('Could not delete image from R2:', url, err);
    });
  }

  // Delete photos uploaded this visit that never got saved, on leave.
  useEffect(() => {
    function cleanupAbandoned() {
      for (const url of sessionUploadsRef.current) {
        if (!savedPhotosRef.current.has(url)) {
          api.deleteKeepalive('/api/upload/image', { url });
        }
      }
      sessionUploadsRef.current.clear();
    }

    const handleUnload = () => cleanupAbandoned();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      cleanupAbandoned();
    };
  }, []);

  // Team changes persist immediately, action by action — there is no separate
  // "Save" step for the card. Returns false when the server rejected it (the
  // caller should then revert its local state).
  async function persistTeam(next: TeamMember[], opts?: { toast?: boolean }) {
    try {
      await api.put('/api/settings', { team: { members: next } });
      // Photos from the previously persisted state that are no longer
      // referenced were superseded — delete them so nothing orphans in R2.
      const nextPhotos = new Set(next.map((m) => m.photo).filter(Boolean));
      for (const url of savedPhotosRef.current) {
        if (!nextPhotos.has(url)) {
          deleteImage(url);
        }
      }
      savedPhotosRef.current = nextPhotos;
      for (const url of nextPhotos) sessionUploadsRef.current.delete(url);
      // Re-run the server-side list query so the displayed page/search reflects
      // the mutation (and get clamped if the last page just shrank).
      void loadTeamRows();
      if (opts?.toast) showToast('success', t('account.teamSaved'));
      return true;
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      return false;
    }
  }

  function moveMember(index: number, delta: number) {
    if (index < 0) return;
    const target = index + delta;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    [next[index], next[target]] = [next[target], next[index]];
    setMembers(next);
    void persistTeam(next);
  }

  async function removeMember(member: TeamMember) {
    // Two-step delete like the pages table: the first click arms the button
    // ("Confirm?"), the second one actually removes the member.
    if (pendingMemberDelete !== member.id) {
      setPendingMemberDelete(member.id);
      return;
    }
    setPendingMemberDelete(null);
    const prev = members;
    const next = members.filter((m) => m.id !== member.id);
    setMembers(next);
    if (await persistTeam(next)) {
      if (member.photo && !savedPhotosRef.current.has(member.photo)) {
        // Photo was uploaded this visit and never persisted — delete it now.
        sessionUploadsRef.current.delete(member.photo);
        deleteImage(member.photo);
      }
      showToast('success', t('account.memberDeleted'));
    } else {
      setMembers(prev);
    }
  }

  function closeMemberForm() {
    setMemberForm(null);
    setMemberPhotoUploading(false);
  }

  async function handleMemberSave(e: FormEvent) {
    e.preventDefault();
    if (!memberForm) return;
    // Enter key can submit the form while the photo is still uploading —
    // ignore it until the upload settles.
    if (memberPhotoUploading) return;
    if (!memberForm.name.trim()) {
      showToast('error', t('account.memberNameRequired'));
      return;
    }

    const prev = members;
    const next: TeamMember[] = memberForm.id
      ? members.map((m) => (m.id === memberForm.id ? { ...m, ...memberForm, id: m.id } : m))
      : [
          ...members,
          { ...emptyMember, ...memberForm, id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
        ];
    setMembers(next);
    setMemberForm(null);
    if (!(await persistTeam(next, { toast: true }))) {
      setMembers(prev);
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // StarterKit v3 bundles the link extension — configure it here.
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: '',
  });

  // Push the opened page's HTML into the editor whenever a page is opened.
  const openedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editor || !form) return;
    const key = form.id ?? 'new';
    if (openedIdRef.current === key) return;
    openedIdRef.current = key;
    const page = form.id ? pages.find((p) => p.id === form.id) : undefined;
    editor.commands.setContent(page?.content ?? '', { emitUpdate: false });
  }, [editor, form, pages]);

  function startAdd() {
    openedIdRef.current = null;
    setSlugTouched(false);
    setForm({ title: '', slug: '', isPublished: false });
  }

  function startEdit(page: ContentPage) {
    openedIdRef.current = null;
    setSlugTouched(true);
    setForm({ id: page.id, title: page.title, slug: page.slug, isPublished: page.isPublished });
  }

  function closeForm() {
    setForm(null);
    openedIdRef.current = null;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        content: editor ? editor.getHTML() : '',
        isPublished: form.isPublished,
      };
      if (form.id) {
        await api.put(`/api/pages/admin/${form.id}`, payload);
        showToast('success', t('content.pageSaved'));
      } else {
        await api.post('/api/pages/admin', payload);
        showToast('success', t('content.pageCreated'));
      }
      closeForm();
      await loadPages();
      void loadPageRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(page: ContentPage) {
    if (pendingDelete !== page.id) {
      setPendingDelete(page.id);
      return;
    }
    setPendingDelete(null);
    try {
      await api.delete(`/api/pages/admin/${page.id}`);
      showToast('success', t('content.pageDeleted'));
      await loadPages();
      void loadPageRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }

  const contentView = can('content.view');
  const teamView = can('team.view');
  // Split the three seeded core pages out of the user-created custom pages.
  // (Custom rows come from the server-side query below — pageRows — not from
  // this full array; only the static card reads straight from `pages`.)
  const staticPages = STATIC_SLUGS.map((slug) => pages.find((p) => p.slug === slug)).filter((p): p is ContentPage => !!p);
  // Static pages open the editor with an "Edit Content" heading.
  const editingStatic = !!form?.id && STATIC_SLUGS.includes(pages.find((p) => p.id === form.id)?.slug ?? '');

  // Server-side query backing the member list: debounced search + page of 5.
  const loadTeamRows = useCallback(async () => {
    setTeamRowsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: { items: TeamMember[]; page: number; totalPages: number; filteredTotal: number; total: number };
      }>(
        `/api/settings/team/members?search=${encodeURIComponent(teamSearch)}&page=${teamPage}&pageSize=5`,
      );
      const d = res.data;
      setTeamRows(d.items || []);
      setTeamMeta({ page: d.page, totalPages: d.totalPages, filteredTotal: d.filteredTotal, total: d.total });
      // The server clamps out-of-range pages — follow it so the pager stays truthful.
      if (d.page !== teamPage) setTeamPage(d.page);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) showToast('error', err.message);
    } finally {
      setTeamRowsLoading(false);
    }
  }, [teamSearch, teamPage, showToast]);

  useEffect(() => {
    if (teamView) void loadTeamRows();
  }, [teamView, loadTeamRows]);

  // Server-side query backing the Custom Pages table (same DataTables shape).
  const loadPageRows = useCallback(async () => {
    setPageRowsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: { items: ContentPage[]; page: number; totalPages: number; filteredTotal: number; total: number };
      }>(
        `/api/pages/admin?search=${encodeURIComponent(pagesSearch)}&page=${pagesPage}&pageSize=${PAGE_SIZE}&exclude=${STATIC_SLUGS.join(',')}`,
      );
      const d = res.data;
      setPageRows(d.items || []);
      setPageMeta({ page: d.page, totalPages: d.totalPages, filteredTotal: d.filteredTotal, total: d.total });
      // The server clamps out-of-range pages — follow it so the pager stays truthful.
      if (d.page !== pagesPage) setPagesPage(d.page);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) showToast('error', err.message);
    } finally {
      setPageRowsLoading(false);
    }
  }, [pagesSearch, pagesPage, showToast]);

  useEffect(() => {
    if (contentView) void loadPageRows();
  }, [contentView, loadPageRows]);

  if (loading || loadingTeam) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <Spinner size={18} />
        </div>
        {t('common.loading')}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
      </div>
    );
  }

  if (!contentView && !teamView) {
    return (
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          {t('content.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>{t('common.noPermission')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('content.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('content.description')}
      </p>

      {/* ── Static pages: core site pages, edit-only ── */}
      {!form && contentView && staticPages.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {t('content.staticPages')}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t('content.staticPagesDesc')}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.pageTitle')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.updated')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {staticPages.map((page) => (
                  <tr key={page.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{page.title}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--muted-text)' }}>
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {can('content.edit') && (
                        <RowAction ariaLabel={t('content.editContent')} onClick={() => startEdit(page)}>
                          <EditIcon />
                        </RowAction>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Custom pages ── */}
      {!form && contentView && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1rem',
          }}
        >
          {/* Header matches the Static Pages / Our Team cards exactly
              (title mb 0.25rem, description mb 0.75rem) — the search box and
              Add Page button live in their own row below, like Our Team. */}
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{t('content.pagesList')}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t('content.customPagesDesc')}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '260px' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={pagesSearchInput}
                onChange={(e) => setPagesSearchInput(e.target.value)}
                placeholder={t('content.searchPages')}
                aria-label={t('content.searchPages')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>
            {can('content.create') && (
              <button
                type="button"
                onClick={startAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('content.addPage')}
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.pageTitle')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.slug')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.status')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('content.updated')}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((page) => (
                  <tr key={page.id} style={{ borderTop: '1px solid var(--border-color)', opacity: pageRowsLoading ? 0.6 : 1 }}>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{page.title}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      /{page.slug}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.1875rem 0.5rem',
                          borderRadius: '999px',
                          background: page.isPublished ? 'var(--success-bg)' : 'var(--disabled-bg)',
                          color: page.isPublished ? 'var(--success-text)' : 'var(--muted-text)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: page.isPublished ? 'var(--success-text)' : 'var(--muted-text)',
                          }}
                        />
                        {page.isPublished ? t('content.published') : t('content.draft')}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--muted-text)' }}>
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {can('content.edit') && (
                        <RowAction ariaLabel={t('common.edit')} onClick={() => startEdit(page)}>
                          <EditIcon />
                        </RowAction>
                      )}
                      {can('content.delete') && (
                        <RowAction
                          danger
                          ariaLabel={pendingDelete === page.id ? t('account.confirmDelete') : t('common.delete')}
                          onClick={() => handleDelete(page)}
                          style={pendingDelete === page.id ? { background: 'rgba(239, 68, 68, 0.12)' } : undefined}
                        >
                          {pendingDelete === page.id ? <ConfirmIcon /> : <DeleteIcon />}
                        </RowAction>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageRowsLoading && (
            <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '0.625rem 0' }}>
              <Spinner size={16} />
            </div>
          )}

          {pageRows.length === 0 && !pageRowsLoading && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', textAlign: 'center', padding: '0.75rem 0' }}>
              {pagesSearch ? t('common.noResults') : t('content.noPages')}
            </p>
          )}

          <ListPager
            page={pageMeta.page}
            totalPages={pageMeta.totalPages}
            filteredTotal={pageMeta.filteredTotal}
            loading={pageRowsLoading}
            onPageChange={setPagesPage}
          />
        </div>
      )}

      {/* ── Editor ── */}
      {form && (
        <form onSubmit={handleSave}>
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              {form.id
                ? editingStatic
                  ? t('content.editContent')
                  : t('content.editPage')
                : t('content.newPage')}
            </h3>

            {/* Static pages are content-only: no slug editing, no status toggle. */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: editingStatic ? '1fr' : '1fr 1fr auto',
                gap: '1rem',
                alignItems: 'start',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>
                  {t('content.pageTitle')} <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => {
                      if (!f) return f;
                      const title = e.target.value;
                      return { ...f, title, slug: slugTouched ? f.slug : slugify(title) };
                    })
                  }
                  required
                  style={inputStyle}
                />
              </div>
              {!editingStatic && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>{t('content.slug')}</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => f && { ...f, slug: slugify(e.target.value) });
                    }}
                    placeholder="privacy-policy"
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                    {t('content.slugHint')}: /{form.slug || slugify(form.title) || '...'}
                  </p>
                </div>
              )}
              {!editingStatic && (
                <PublishedToggle
                  value={form.isPublished}
                  onChange={(v) => setForm((f) => f && { ...f, isPublished: v })}
                />
              )}
            </div>

            {/* ── Rich text editor ── */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>{t('content.body')}</label>
              {editor && <Toolbar editor={editor} />}
              <div
                style={{
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--input-bg)',
                }}
              >
                <EditorContent editor={editor} />
                <style>{`
                  .tiptap { min-height: 320px; padding: 0.875rem 1rem; outline: none; font-size: 0.875rem; line-height: 1.6; color: var(--text-main); }
                  .tiptap:focus { outline: none; }
                  .tiptap p { margin: 0 0 0.5rem; }
                  .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
                  .tiptap h2 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.5rem; }
                  .tiptap h3 { font-size: 1.0625rem; font-weight: 600; margin: 0.75rem 0 0.375rem; }
                  .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.5rem; }
                  .tiptap ul { list-style: disc; }
                  .tiptap ol { list-style: decimal; }
                  .tiptap blockquote { border-left: 3px solid var(--accent); margin: 0.5rem 0; padding: 0.25rem 0 0.25rem 0.875rem; color: var(--text-muted); }
                  .tiptap code { background: var(--bg-hover); border-radius: 4px; padding: 0.125rem 0.3125rem; font-size: 0.8125em; }
                  .tiptap pre { background: var(--bg-hover); border-radius: 8px; padding: 0.75rem 1rem; overflow-x: auto; margin: 0.5rem 0; }
                  .tiptap pre code { background: none; padding: 0; }
                  .tiptap hr { border: none; border-top: 1px solid var(--border-color); margin: 1rem 0; }
                  .tiptap a { color: var(--accent); text-decoration: underline; }
                  .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--muted-text); float: left; height: 0; pointer-events: none; }
                `}</style>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  padding: '0.625rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  minWidth: '110px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.625rem 1.5rem',
                  borderRadius: '8px',
                  backgroundColor: saving ? 'var(--accent-hover)' : 'var(--accent)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? <Spinner /> : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Our Team (shown on the public website) ── */}
      {teamView && (
        <Section title={t('account.ourTeam')} description={t('account.ourTeamDesc')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '260px' }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--muted-text)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('account.searchMembers')}
                  aria-label={t('account.searchMembers')}
                  style={{ ...inputStyle, height: '36px', paddingLeft: '2rem' }}
                />
              </div>
              {can('team.edit') && (
                <button
                  type="button"
                  onClick={() => setMemberForm({ ...emptyMember })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('account.addMember')}
                </button>
              )}
            </div>

            {memberForm && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 1100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {memberForm.id ? t('common.edit') : t('account.addMember')}
                    </h4>
                    <button
                      type="button"
                      onClick={closeMemberForm}
                      aria-label={t('common.cancel')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                <form
                  onSubmit={handleMemberSave}
                >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <Input
                    label={t('account.memberName')}
                    value={memberForm.name}
                    onChange={(v) => setMemberForm((p) => (p ? { ...p, name: v } : p))}
                    placeholder={t('account.memberName')}
                    required
                  />
                  <Input
                    label={t('account.position')}
                    value={memberForm.position}
                    onChange={(v) => setMemberForm((p) => (p ? { ...p, position: v } : p))}
                    placeholder={t('account.position')}
                  />
                  <Input
                    label="Email"
                    value={memberForm.email}
                    onChange={(v) => setMemberForm((p) => (p ? { ...p, email: v } : p))}
                    placeholder="Email"
                    type="email"
                  />
                  <Input
                    label="LinkedIn"
                    value={memberForm.linkedin}
                    onChange={(v) => setMemberForm((p) => (p ? { ...p, linkedin: v } : p))}
                    placeholder="LinkedIn URL"
                    type="url"
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <Textarea
                    label={t('account.bio')}
                    value={memberForm.bio}
                    onChange={(v) => setMemberForm((p) => (p ? { ...p, bio: v } : p))}
                    placeholder={t('account.bio')}
                    rows={3}
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <ImageUploader
                    label={t('account.photo')}
                    value={memberForm.photo}
                    onUploadingChange={setMemberPhotoUploading}
                    onUpload={(url) => {
                      sessionUploadsRef.current.add(url);
                      setMemberForm((p) => (p ? { ...p, photo: url } : p));
                    }}
                    onRemove={() => {
                      // Only photos uploaded this visit (not yet saved) get deleted
                      // right away; saved ones are cleaned up on save.
                      if (memberForm.photo && !savedPhotosRef.current.has(memberForm.photo)) {
                        sessionUploadsRef.current.delete(memberForm.photo);
                        deleteImage(memberForm.photo);
                      }
                      setMemberForm((p) => (p ? { ...p, photo: '' } : p));
                    }}
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <span style={labelStyle}>{t('account.visibility')}</span>
                  <VisibilityToggle
                    visible={memberForm.visible}
                    onChange={() => setMemberForm((p) => (p ? { ...p, visible: !p.visible } : p))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={closeMemberForm}
                    style={{
                      background: 'var(--secondary-btn-bg)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={memberPhotoUploading}
                    style={{
                      minWidth: '110px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: memberPhotoUploading ? 'not-allowed' : 'pointer',
                      opacity: memberPhotoUploading ? 0.7 : 1,
                    }}
                  >
                    {memberPhotoUploading && <Spinner />}
                    {memberForm.id ? t('common.save') : t('account.addMember')}
                  </button>
                </div>
                </form>
                </div>
              </div>
            )}

            {teamRows.length === 0 && !teamRowsLoading && (
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', padding: '0.75rem 0' }}>
                {teamSearch ? t('account.noSearchResults') : t('account.noMembers')}
              </p>
            )}

            {teamRows.map((member, index) => {
              // Where this member sits in the full list — search/pagination only
              // change which rows are displayed; mutations use the full list.
              const gi = members.findIndex((m) => m.id === member.id);
              return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-color)',
                  opacity: teamRowsLoading ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button
                    type="button"
                    aria-label={t('account.moveUp')}
                    onClick={() => moveMember(gi, -1)}
                    disabled={!can('team.edit') || gi <= 0}
                    style={{ ...moveBtnStyle, opacity: !can('team.edit') || gi <= 0 ? 0.35 : 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={t('account.moveDown')}
                    onClick={() => moveMember(gi, 1)}
                    disabled={!can('team.edit') || gi < 0 || gi >= members.length - 1}
                    style={{ ...moveBtnStyle, opacity: !can('team.edit') || gi < 0 || gi >= members.length - 1 ? 0.35 : 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {member.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photo}
                    alt={member.name}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--secondary-btn-bg)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{member.name}</span>
                    <VisibilityToggle
                      visible={member.visible}
                      onChange={() => {
                        const next = members.map((m) => (m.id === member.id ? { ...m, visible: !m.visible } : m));
                        setMembers(next);
                        void persistTeam(next);
                      }}
                      disabled={!can('team.edit')}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                    {member.position || '—'}
                    {member.linkedin && (
                      <>
                        {' · '}
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          LinkedIn
                        </a>
                      </>
                    )}
                  </span>
                </div>

                {can('team.edit') && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <RowAction ariaLabel={t('common.edit')} onClick={() => setMemberForm({ ...member })}>
                      <EditIcon />
                    </RowAction>
                    <RowAction
                      danger
                      ariaLabel={pendingMemberDelete === member.id ? t('account.confirmDelete') : t('common.delete')}
                      onClick={() => removeMember(member)}
                      style={pendingMemberDelete === member.id ? { background: 'rgba(239, 68, 68, 0.12)' } : undefined}
                    >
                      {pendingMemberDelete === member.id ? <ConfirmIcon /> : <DeleteIcon />}
                    </RowAction>
                  </div>
                )}
              </div>
              );
            })}

            {/* Spinner for the server-side search/pagination query — rows stay
                visible (dimmed) while it runs; this is the only thing shown
                when the current page is empty mid-query. */}
            {teamRowsLoading && (
              <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '0.625rem 0' }}>
                <Spinner size={16} />
              </div>
            )}

            <ListPager
              page={teamMeta.page}
              totalPages={teamMeta.totalPages}
              filteredTotal={teamMeta.filteredTotal}
              loading={teamRowsLoading}
              onPageChange={setTeamPage}
            />
          </Section>
      )}



      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast((prev) => (prev && prev.id === toast.id ? null : prev))}
        />
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const { t } = useLanguage();

  const buttons: { label: string; titleKey: TranslationKey; active?: boolean; run: (e: Editor) => void; supported?: boolean }[] = [
    { label: 'B', titleKey: 'content.bold', active: editor.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
    { label: 'I', titleKey: 'content.italic', active: editor.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
    { label: 'S', titleKey: 'content.strike', active: editor.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
    { label: 'H1', titleKey: 'content.h1', active: editor.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', titleKey: 'content.h2', active: editor.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', titleKey: 'content.h3', active: editor.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'UL', titleKey: 'content.bulletList', active: editor.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: 'OL', titleKey: 'content.orderedList', active: editor.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: '"', titleKey: 'content.quote', active: editor.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: '</>', titleKey: 'content.codeBlock', active: editor.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { label: '—', titleKey: 'content.hr', run: (e) => e.chain().focus().setHorizontalRule().run() },
  ];

  function applyLink() {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt(t('content.linkUrlPrompt'), 'https://');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        padding: '0.375rem',
        border: '1px solid var(--input-border)',
        borderBottom: 'none',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          title={t(b.titleKey)}
          onClick={() => b.run(editor)}
          style={{
            minWidth: '1.75rem',
            height: '1.75rem',
            padding: '0 0.375rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: b.active ? 'var(--accent-light)' : 'transparent',
            color: b.active ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: b.label === '</>' ? 'monospace' : 'inherit',
          }}
        >
          {b.label}
        </button>
      ))}
      <button
        type="button"
        title={t('content.link')}
        onClick={applyLink}
        style={{
          minWidth: '1.75rem',
          height: '1.75rem',
          padding: '0 0.375rem',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: editor.isActive('link') ? 'var(--accent-light)' : 'transparent',
          color: editor.isActive('link') ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <span style={{ width: 1, background: 'var(--border-color)', margin: '0.125rem 0.25rem' }} />
      <button
        type="button"
        title={t('content.undo')}
        onClick={() => editor.chain().focus().undo().run()}
        style={toolBtnStyle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>
      <button
        type="button"
        title={t('content.redo')}
        onClick={() => editor.chain().focus().redo().run()}
        style={toolBtnStyle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>
    </div>
  );
}

const toolBtnStyle: React.CSSProperties = {
  minWidth: '1.75rem',
  height: '1.75rem',
  padding: '0 0.375rem',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function PublishedToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: value ? 'var(--success-text)' : 'var(--muted-text)' }}>
        {value ? t('content.published') : t('content.draft')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t('content.published')}
        onClick={() => onChange(!value)}
        style={{
          width: 48,
          height: 26,
          borderRadius: 999,
          border: 'none',
          background: value ? 'var(--accent)' : 'var(--input-border)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.15s',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 25 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
      }}
    >
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: description ? '0.25rem' : '0.75rem' }}>
        {title}
      </h3>
      {description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{description}</p>}
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  helperText,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          background: 'var(--input-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {helperText && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>{helperText}</span>}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
          {label}
        </span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          background: 'var(--input-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.5,
        }}
      />
    </label>
  );
}

function VisibilityToggle({ visible, onChange, disabled }: { visible: boolean; onChange: () => void; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={visible ? t('account.visibleOnWebsite') : t('account.hidden')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        background: visible ? 'var(--success-bg)' : 'var(--disabled-bg)',
        color: visible ? 'var(--success-text)' : 'var(--muted-text)',
        border: 'none',
        padding: '0.1875rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {visible ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <path d="M1 1l22 22" />
          </>
        )}
      </svg>
      {visible ? t('account.visible') : t('account.hidden')}
    </button>
  );
}

function RowAction({ children, onClick, danger, ariaLabel, title, disabled, style }: {
  children?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className="row-icon-btn"
      style={{
        background: 'var(--bg-hover)',
        border: 'none',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: danger ? 'var(--error-text)' : 'var(--accent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '6px',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 26,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--label-text)',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  borderRadius: '8px',
  border: '1px solid var(--input-border)',
  padding: '0 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
};
