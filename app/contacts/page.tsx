'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Mail, Building2, Clock3, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { cn, toISODate, daysAgo } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';

type ContactStatus = 'not_sent' | 'contacted' | 'replied' | 'opt_out' | 'cycle_one';

type Contact = {
  id: number;
  name: string | null;
  email: string;
  company: string | null;
  status: ContactStatus;
  last_contacted_at: string | null;
  created_at: string | null;
  linkedin_url: string | null;
  organization_website: string | null;
  position: string | null;
  industry: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  replied: boolean | null;
  opted_out: boolean | null;
};

type ContactEvent = {
  id: string;
  event_type: string;
  event_ts: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  campaign_name?: string | null;
  email_number?: number | null;
  contact_email?: string | null;
};

type ContactDetail = Contact & { events: ContactEvent[]; linkedin_url?: string | null };

const columnHelper = createColumnHelper<Contact>();
const PAGE_SIZE = 50;

function statusVariant(status: ContactStatus) {
  switch (status) {
    case 'replied':
      return 'success';
    case 'opt_out':
      return 'warning';
    case 'contacted':
      return 'success';
    case 'cycle_one':
      return 'success';
    case 'not_sent':
    default:
      return 'secondary';
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  // Treat incoming timestamp as UTC and display in Pacific time
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });
}

function industryVariant(val: string | null | undefined): 'warning' | 'purple' | 'success' | 'default' | 'secondary' | 'magenta' {
  if (!val) return 'secondary';
  const normalized = String(val).toLowerCase();
  if (normalized.includes('facilities services') || normalized.includes('facility services')) return 'magenta';
  if (normalized.includes('construction')) return 'warning';
  if (normalized.includes('appliance') || normalized.includes('electrical') || normalized.includes('electronics')) return 'purple';
  if (normalized.includes('environmental')) return 'default';
  return 'default';
}

export default function ContactsPage() {
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>('1');
  const [hasMore, setHasMore] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Date range state for filtering
  const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    company: '',
    linkedin_url: '',
    organization_website: '',
    position: '',
    industry: '',
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const detailCache = useRef<Map<number, ContactDetail>>(new Map());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (cursor: string | null, reset = false) => {
      if (!workspaceId || !cursor) return;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: String(PAGE_SIZE),
        cursor,
        startDate,
        endDate,
      });
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      try {
        const res = await fetch(`/api/contacts?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load contacts');
        }
        const body = await res.json();
        const incoming: Contact[] = body.contacts || [];
        setContacts(prev => (reset ? incoming : [...prev, ...incoming]));
        setNextCursor(body.next_cursor);
        setHasMore(Boolean(body.next_cursor));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, debouncedSearch, startDate, endDate]
  );

  // Initial + search + date range reload
  useEffect(() => {
    setContacts([]);
    setNextCursor('1');
    setHasMore(true);
    if (workspaceId) {
      fetchPage('1', true);
    }
  }, [workspaceId, debouncedSearch, startDate, endDate, fetchPage]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && nextCursor) {
          fetchPage(nextCursor);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, nextCursor, fetchPage]);

  const table = useReactTable({
    data: contacts,
    columns: useMemo(
      () => [
        columnHelper.accessor('id', {
          header: 'ID',
          cell: info => info.getValue(),
        }),
        columnHelper.accessor('name', {
          header: 'Name',
          cell: info => (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">
                {info.getValue() || 'Unknown'}
              </span>
              <span className="text-xs text-text-secondary">{info.row.original.email}</span>
            </div>
          ),
        }),
        columnHelper.accessor('company', {
          header: 'Company',
          cell: info => info.getValue() || '—',
        }),
        columnHelper.accessor('industry', {
          header: 'Industry',
          cell: info => {
            const val = info.getValue();
            if (!val) return <span className="text-text-secondary">—</span>;
            const variant = industryVariant(val);
            return (
              <Badge variant={variant} className="capitalize">
                {val}
              </Badge>
            );
          },
        }),
        columnHelper.accessor('status', {
          header: 'Status',
          cell: info => {
            const status = info.getValue() as ContactStatus;
            const label = status === 'cycle_one' ? 'Cycle One ✓' : status.replace('_', ' ');
            return (
              <Badge variant={statusVariant(status) as any} className="capitalize">
                {label}
              </Badge>
            );
          },
        }),
        columnHelper.accessor('last_contacted_at', {
          header: 'Last Contacted',
          cell: info => (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock3 className="h-4 w-4" />
              {formatDateTime(info.getValue())}
            </div>
          ),
        }),
      ],
      []
    ),
    getCoreRowModel: getCoreRowModel(),
  });

  const loadDetail = useCallback(
    async (contactId: number) => {
      if (!workspaceId) return;
      const cached = detailCache.current.get(contactId);
      if (cached) {
        setDetail(cached);
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        const params = new URLSearchParams({ workspace_id: workspaceId });
        const res = await fetch(`/api/contacts/${contactId}?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load contact detail');
        }
        const body = await res.json();
        const detailData: ContactDetail = {
          id: body.id,
          name: body.name,
          email: body.email,
          company: body.company,
          status: body.status,
          last_contacted_at: body.last_contacted_at,
          created_at: body.created_at,
          events: body.events || [],
          linkedin_url: body.linkedin_url || null,
          organization_website: body.organization_website || null,
          position: body.position || null,
          industry: body.industry || null,
          email_1_sent: body.email_1_sent ?? null,
          email_2_sent: body.email_2_sent ?? null,
          email_3_sent: body.email_3_sent ?? null,
          replied: body.replied ?? null,
          opted_out: body.opted_out ?? null,
        };
        detailCache.current.set(contactId, detailData);
        setDetail(detailData);
      } catch (err) {
        console.error(err);
        setDetailError(err instanceof Error ? err.message : 'Failed to load contact detail');
      } finally {
        setDetailLoading(false);
      }
    },
    [workspaceId]
  );

  const handleRowClick = (contactId: number) => {
    setSelectedContactId(contactId);
    loadDetail(contactId);
  };

  const closeDetail = () => {
    setSelectedContactId(null);
    setDetail(null);
    setDetailError(null);
  };

  const handleAddLead = async () => {
    if (!workspaceId) return;
    setAddError(null);
    if (!addForm.email) {
      setAddError('Email is required');
      return;
    }
    setAddLoading(true);
    try {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      const res = await fetch(`/api/contacts?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          name: addForm.name || null,
          company: addForm.company || null,
          source: 'manual_crm_add',
            linkedin_url: addForm.linkedin_url || null,
            organization_website: addForm.organization_website || null,
            position: addForm.position || null,
            industry: addForm.industry || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Failed to add contact');
      }
      if (body.contact) {
        setContacts(prev => [body.contact as Contact, ...prev]);
        detailCache.current.delete(body.contact.id);
      }
      setShowAdd(false);
      setAddForm({
        name: '',
        email: '',
        company: '',
        linkedin_url: '',
        organization_website: '',
        position: '',
        industry: '',
      });
    } catch (err) {
      console.error(err);
      setAddError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setAddLoading(false);
    }
  };

  // Derive per-email status boxes from timeline events
  type EmailBox = { emailNumber: number; status: string; variant: string; lastTs: string | null };
  const deriveEmailBox = (n: number): EmailBox => {
    const flag =
      n === 1 ? detail?.email_1_sent : n === 2 ? detail?.email_2_sent : detail?.email_3_sent;

    if (detail?.replied) {
      return { emailNumber: n, status: 'Replied', variant: 'success', lastTs: null };
    }
    if (detail?.opted_out) {
      return { emailNumber: n, status: 'Opted out', variant: 'warning', lastTs: null };
    }
    if (detail?.email_1_sent && detail?.email_2_sent && detail?.email_3_sent) {
      return { emailNumber: n, status: 'Cycle One ✓', variant: 'success', lastTs: null };
    }
    if (flag) {
      return { emailNumber: n, status: 'Sent', variant: 'success', lastTs: null };
    }

    const evts = detail?.events?.filter(e => e.email_number === n) || [];
    if (evts.length) {
      const lastTs = evts[evts.length - 1]?.event_ts || evts[evts.length - 1]?.created_at || null;
      return { emailNumber: n, status: 'Sent', variant: 'success', lastTs };
    }

    return { emailNumber: n, status: 'Not sent', variant: 'secondary', lastTs: null };
  };

  const emailBoxes = [1, 2, 3].map(deriveEmailBox);

  return (
    <Suspense fallback={null}>
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
            <Users className="w-6 h-6 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Contacts</h1>
            <p className="text-sm text-text-secondary">
              View your leads with timeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, company..."
              className="pl-9 w-72"
            />
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Master Grid</CardTitle>
          <p className="text-sm text-text-secondary">
            50 per page with infinite scroll
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide',
                          header.id === 'id' && 'w-[8%]',
                          header.id === 'name' && 'w-[23%]',
                          header.id === 'company' && 'w-[20%]',
                          header.id === 'industry' && 'w-[20%]',
                          header.id === 'status' && 'w-[14%]',
                          header.id === 'last_contacted_at' && 'w-[15%]'
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={table.getAllColumns().length}
                      className="px-6 py-12 text-center text-text-secondary"
                    >
                      No contacts yet.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-surface-elevated cursor-pointer transition-colors"
                      onClick={() => handleRowClick(row.original.id)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-4 py-4 text-sm text-text-primary align-top',
                            cell.column.id === 'id' && 'w-[8%]',
                            cell.column.id === 'name' && 'w-[23%]',
                            cell.column.id === 'company' && 'w-[20%]',
                            cell.column.id === 'industry' && 'w-[20%]',
                            cell.column.id === 'status' && 'w-[14%]',
                            cell.column.id === 'last_contacted_at' && 'w-[15%]'
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {loading && (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-accent-danger bg-accent-danger/5">{error}</div>
          )}
          <div ref={sentinelRef} className="h-6" />
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedContactId && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
            />
            <motion.aside
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-background z-50 shadow-2xl border-l border-border flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <p className="text-xs uppercase text-text-secondary mb-1">Contact</p>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {detail?.name || 'Unknown'}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail className="h-4 w-4" />
                    {detail?.email || '—'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeDetail}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="px-6 py-4 border-b border-border grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Building2 className="h-4 w-4" />
                  <span className="text-text-primary">{detail?.company || '—'}</span>
                </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Badge variant={industryVariant(detail?.industry) as any}>
                  {detail?.industry || 'No industry'}
                </Badge>
              </div>
              <div className="text-sm text-text-secondary truncate">
                LinkedIn:{' '}
                {detail?.linkedin_url ? (
                  <a
                    href={detail.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-primary hover:underline"
                  >
                    {detail.linkedin_url}
                  </a>
                ) : (
                  '—'
                )}
              </div>
                <div className="text-sm text-text-secondary">
                  Website:{' '}
                  {detail?.organization_website ? (
                    <a
                      href={detail.organization_website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-primary hover:underline break-all"
                    >
                      {detail.organization_website}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="text-sm text-text-secondary break-words">
                  Position: {detail?.position ? detail.position : '—'}
                </div>
              </div>

            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Email status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {emailBoxes.map(box => (
                  <div
                    key={box.emailNumber}
                    className="rounded-lg border border-border bg-surface p-3 space-y-1"
                  >
                    <div className="text-xs uppercase text-text-secondary">Email {box.emailNumber}</div>
                    <Badge variant={box.variant as any}>{box.status}</Badge>
                    <div className="text-xs text-text-secondary">
                      {box.lastTs ? formatDateTime(box.lastTs) : 'Not sent'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

              <div className="px-6 py-4 flex-1 overflow-y-auto">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Timeline</h3>
                {detailLoading && (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                )}
                {detailError && (
                  <div className="text-sm text-accent-danger bg-accent-danger/5 p-3 rounded-lg">
                    {detailError}
                  </div>
                )}
                {!detailLoading && !detailError && (
                  <div className="space-y-3">
                    {detail?.events?.length ? (
                      detail.events.map(event => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border bg-surface p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-primary capitalize">
                              {event.event_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {formatDateTime(event.event_ts || event.created_at)}
                            </span>
                          </div>
                          {event.campaign_name && (
                            <p className="text-xs text-text-secondary mt-1">
                              Campaign: {event.campaign_name}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-secondary">No events yet.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add Lead</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Name</label>
                    <Input
                      value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Email *</label>
                    <Input
                      value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Organization Name</label>
                    <Input
                      value={addForm.company}
                      onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">LinkedIn URL</label>
                    <Input
                      value={addForm.linkedin_url}
                      onChange={e => setAddForm(f => ({ ...f, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Organization Website</label>
                    <Input
                      value={addForm.organization_website}
                      onChange={e => setAddForm(f => ({ ...f, organization_website: e.target.value }))}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Position</label>
                    <Input
                      value={addForm.position}
                      onChange={e => setAddForm(f => ({ ...f, position: e.target.value }))}
                      placeholder="Head of Growth"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-text-secondary">Industry</label>
                    <Input
                      value={addForm.industry}
                      onChange={e => setAddForm(f => ({ ...f, industry: e.target.value }))}
                      placeholder="SaaS"
                    />
                  </div>
                </div>
                {addError && (
                  <div className="text-sm text-accent-danger bg-accent-danger/5 p-3 rounded-lg">
                    {addError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLead} disabled={addLoading}>
                    {addLoading ? 'Saving...' : 'Save & Trigger'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </Suspense>
  );
}

