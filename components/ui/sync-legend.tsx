/**
 * Phase 32 Pillar 3: Sync Status Legend Component
 * Real-Time Synchronization Fabric - Status Legend
 * 
 * Static component explaining sync status colors.
 */

const LEGEND_ITEMS = [
  {
    color: 'bg-green-500',
    label: 'Live',
    description: 'Workflow is active and responding',
  },
  {
    color: 'bg-amber-500',
    label: 'Syncing',
    description: 'Sync in progress',
  },
  {
    color: 'bg-gray-500',
    label: 'Stale',
    description: 'No heartbeat in last 60 seconds',
  },
  {
    color: 'bg-red-500',
    label: 'Error',
    description: 'Workflow error or unreachable',
  },
] as const;

export function SyncLegend() {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-text-secondary font-medium">Status:</span>
      {LEGEND_ITEMS.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 cursor-help"
          title={item.description}
        >
          <div className={`h-2 w-2 rounded-full ${item.color}`} />
          <span className="text-text-primary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
