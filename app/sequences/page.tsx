'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { SequenceList } from '@/components/sequences/sequence-list';
import { SequenceDetail } from '@/components/sequences/sequence-detail';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { DateRangePickerMobile } from '@/components/dashboard/date-range-picker-mobile';
import { toISODate, daysAgo } from '@/lib/utils';
import type { SequenceListResponse, SequenceDetail as SequenceDetailType } from '@/lib/dashboard-types';
import { Mail, ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LIMIT_OPTIONS = [50, 100, 500, 1000, 'all'] as const;
type LimitOption = typeof LIMIT_OPTIONS[number];

export default function SequencesPage() {
  const { workspaceId } = useWorkspace();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [limit, setLimit] = useState<LimitOption>(50);
  const [showDetail, setShowDetail] = useState(false); // For mobile navigation
  const [showFilters, setShowFilters] = useState(false); // For mobile filter sheet
  
  // Date range state for filtering
  const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  
  const handleDateChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Fetch lightweight list for sidebar
  const listUrl = workspaceId 
    ? `/api/sequences?workspace_id=${workspaceId}&limit=${limit}&startDate=${startDate}&endDate=${endDate}` 
    : null;
  
  const { 
    data: listData, 
    error: listError, 
    isLoading: listLoading 
  } = useSWR<SequenceListResponse>(listUrl, fetcher, {
    refreshInterval: 30000,
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

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setShowDetail(true); // Navigate to detail on mobile
  }, []);

  const handleBack = useCallback(() => {
    setShowDetail(false);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base pb-20 md:pb-0">
      {/* Header - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-base border-b border-border-primary px-4 md:px-6 py-4 md:py-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title Row */}
          <div className="flex items-center gap-3">
            {/* Back button on mobile when viewing detail */}
            <AnimatePresence mode="wait">
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="md:hidden"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-10 w-10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 md:w-6 md:h-6 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary">Sequences</h1>
              <p className="text-text-secondary text-xs md:text-sm hidden sm:block">
                Preview your email drafts
              </p>
            </div>
          </div>
          
          {/* Desktop: Inline filters */}
          <div className="hidden md:flex items-center gap-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Items:</span>
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

          {/* Mobile: Filter button + Date picker */}
          <div className="flex items-center gap-2 md:hidden">
            <DateRangePickerMobile
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
              className="h-10 px-3"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Filter Sheet */}
      <BottomSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
      >
        <div className="px-4 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Items per page
            </label>
            <select
              value={limit}
              onChange={(e) => {
                const value = e.target.value;
                setLimit(value === 'all' ? 'all' : Number(value) as LimitOption);
                setShowFilters(false);
              }}
              className="w-full px-4 py-3 text-base bg-surface-elevated border border-border-primary rounded-lg text-text-primary"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All items' : `${option} items`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </BottomSheet>

      {/* Desktop: Two-column layout */}
      <div className="hidden md:flex h-[calc(100vh-140px)]">
        {/* Sidebar - List */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 border-r border-border-primary bg-surface-base overflow-y-auto"
        >
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Leads ({listData?.total || 0})
              </h2>
            </div>

            {listError && (
              <div className="p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                Failed to load sequences. Please refresh.
              </div>
            )}

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
            {detailError && (
              <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                Failed to load sequence details. Please try selecting another lead.
              </div>
            )}

            <SequenceDetail
              detail={detailData || null}
              loading={detailLoading}
            />
          </div>
        </motion.main>
      </div>

      {/* Mobile: Single-column with slide navigation */}
      <div className="md:hidden">
        <AnimatePresence mode="wait">
          {!showDetail ? (
            // List View
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Leads ({listData?.total || 0})
                </h2>
              </div>

              {listError && (
                <div className="p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger mb-4">
                  Failed to load sequences. Please refresh.
                </div>
              )}

              <SequenceList
                items={listData?.items || []}
                selectedId={selectedId}
                onSelect={handleSelect}
                loading={listLoading}
              />
            </motion.div>
          ) : (
            // Detail View
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              {detailError && (
                <div className="mb-4 p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                  Failed to load sequence details.
                </div>
              )}

              <SequenceDetail
                detail={detailData || null}
                loading={detailLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
