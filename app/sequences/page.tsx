'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { SequenceList } from '@/components/sequences/sequence-list';
import { SequenceDetail } from '@/components/sequences/sequence-detail';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { toISODate, daysAgo } from '@/lib/utils';
import type { SequenceListResponse, SequenceDetail as SequenceDetailType } from '@/lib/dashboard-types';
import { Mail } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LIMIT_OPTIONS = [50, 100, 500, 1000, 'all'] as const;
type LimitOption = typeof LIMIT_OPTIONS[number];

export default function SequencesPage() {
  const { workspaceId } = useWorkspace();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [limit, setLimit] = useState<LimitOption>(50);
  
  // Date range state for filtering
  const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Fetch lightweight list for sidebar
  const listUrl = workspaceId 
    ? `/api/sequences?workspace_id=${workspaceId}&limit=${limit}&startDate=${startDate}&endDate=${endDate}` 
    : null;
  
  const { 
    data: listData, 
    error: listError, 
    isLoading: listLoading 
  } = useSWR<SequenceListResponse>(listUrl, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    keepPreviousData: true,
  });

  // Fetch heavy detail for selected item
  const detailUrl = selectedId && workspaceId
    ? `/api/sequences/${selectedId}?workspace_id=${workspaceId}`
    : null;

  const {
    data: detailData,
    error: detailError,
    isLoading: detailLoading,
  } = useSWR<SequenceDetailType>(detailUrl, fetcher, {
    keepPreviousData: true,
  });

  // Auto-select first item when list loads
  useEffect(() => {
    if (!selectedId && listData?.items && listData.items.length > 0) {
      setSelectedId(listData.items[0].id);
    }
  }, [listData, selectedId]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-base border-b border-border-primary px-6 py-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Sequences</h1>
              <p className="text-text-secondary text-sm mt-1">
                Preview your email drafts
              </p>
            </div>
          </div>
          
          {/* Date range and items per page selectors */}
          <div className="flex items-center gap-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Items per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const value = e.target.value;
                  setLimit(value === 'all' ? 'all' : Number(value) as LimitOption);
                }}
                className="px-3 py-1.5 text-sm bg-surface-elevated border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout with fixed height and independent scrolling */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Sidebar - List */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 border-r border-border-primary bg-surface-base overflow-y-auto"
        >
          <div className="p-4">
            {/* List Header */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Leads ({listData?.total || 0})
              </h2>
            </div>

            {/* Error State */}
            {listError && (
              <div className="p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                Failed to load sequences. Please refresh.
              </div>
            )}

            {/* List Component */}
            <SequenceList
              items={listData?.items || []}
              selectedId={selectedId}
              onSelect={handleSelect}
              loading={listLoading}
            />
          </div>
        </motion.aside>

        {/* Main - Detail */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-6">
            {/* Error State */}
            {detailError && (
              <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                Failed to load sequence details. Please try selecting another lead.
              </div>
            )}

            {/* Detail Component */}
            <SequenceDetail
              detail={detailData || null}
              loading={detailLoading}
            />
          </div>
        </motion.main>
      </div>
    </div>
  );
}
