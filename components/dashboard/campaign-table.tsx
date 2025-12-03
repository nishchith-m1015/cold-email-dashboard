'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { CampaignStats } from '@/hooks/use-metrics';

interface CampaignTableProps {
  data: CampaignStats[];
  loading?: boolean;
  className?: string;
}

const columnHelper = createColumnHelper<CampaignStats>();

export function CampaignTable({ data, loading = false, className }: CampaignTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'sends', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    columnHelper.accessor('campaign', {
      header: 'Campaign',
      cell: info => (
        <div className="font-medium text-text-primary">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('sends', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting()}
        >
          Sends
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      ),
      cell: info => formatNumber(info.getValue()),
    }),
    columnHelper.accessor('replies', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting()}
        >
          Replies
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      ),
      cell: info => (
        <span className="text-accent-success font-medium">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('reply_rate_pct', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting()}
        >
          Reply %
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      ),
      cell: info => {
        const value = info.getValue();
        const variant = value >= 5 ? 'success' : value >= 2 ? 'warning' : 'danger';
        return <Badge variant={variant}>{formatPercent(value)}</Badge>;
      },
    }),
    columnHelper.accessor('opt_outs', {
      header: 'Opt-Outs',
      cell: info => (
        <span className="text-accent-danger">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('opt_out_rate_pct', {
      header: 'Opt-Out %',
      cell: info => {
        const value = info.getValue();
        const variant = value <= 0.5 ? 'success' : value <= 1 ? 'warning' : 'danger';
        return <Badge variant={variant}>{formatPercent(value)}</Badge>;
      },
    }),
    columnHelper.accessor('cost_usd', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting()}
        >
          Cost
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      ),
      cell: info => (
        <span className="text-accent-purple font-medium">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('cost_per_reply', {
      header: 'Cost/Reply',
      cell: info => {
        const value = info.getValue();
        return value > 0 ? formatCurrency(value) : '—';
      },
    }),
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-base">Campaign Performance</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search campaigns..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
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
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center text-text-secondary"
                    >
                      No campaigns found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      className="hover:bg-surface-elevated/50 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

