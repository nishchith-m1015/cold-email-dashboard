# Future Role Hierarchy Implementation

> **Status**: DEFERRED - Implement after dashboard has more features
> **Phase**: Final phase before production

## Current Situation
The dashboard is view-only (data comes from n8n). Traditional CRUD roles don't apply.

## Proposed Hierarchy for Analytics Dashboard

| Role | Team Management | Cost Data | Detailed Breakdowns | Summary Metrics |
|------|-----------------|-----------|---------------------|-----------------|
| **Owner** | Invite anyone, manage workspace, generate codes | ✓ See all costs | ✓ Full access | ✓ |
| **Admin** | Invite members/viewers | ✓ See all costs | ✓ Full access | ✓ |
| **Member** | No invite ability | ✗ Hidden | ✓ Full access | ✓ |
| **Viewer** | No invite ability | ✗ Hidden | ✗ Limited | ✓ Summary only |

## Implementation Details

### Data Visibility by Role

```typescript
const ROLE_VISIBILITY = {
  owner: {
    canSeeCosts: true,
    canSeePerSender: true,
    canSeePerCampaign: true,
    canSeeRawData: true,
    canExport: true,
  },
  admin: {
    canSeeCosts: true,
    canSeePerSender: true,
    canSeePerCampaign: true,
    canSeeRawData: true,
    canExport: true,
  },
  member: {
    canSeeCosts: false,        // Hide LLM costs
    canSeePerSender: true,
    canSeePerCampaign: true,
    canSeeRawData: false,
    canExport: false,
  },
  viewer: {
    canSeeCosts: false,
    canSeePerSender: false,    // Only summary
    canSeePerCampaign: false,  // Only summary
    canSeeRawData: false,
    canExport: false,
  },
};
```

### Use Cases

1. **Owner (Nishchith)**: Full access, manages team
2. **Client**: Member role - sees campaign metrics but not AI costs
3. **Contractor**: Viewer role - sees summary only
4. **Team member**: Admin role - can help manage but you retain ownership

### Files to Modify (when implementing)

1. `lib/workspace-access.ts` - Update ROLE_PERMISSIONS
2. `hooks/use-dashboard-data.ts` - Filter data based on role
3. `app/page.tsx` - Conditionally render cost components
4. `app/analytics/page.tsx` - Hide detailed breakdowns for viewers
5. `components/dashboard/cost-breakdown.tsx` - Add role check
6. `components/dashboard/sender-breakdown.tsx` - Add role check

### API Changes

Each metrics API should check user role and filter response:
```typescript
// In API routes
const { access } = await getCurrentUserAccess(workspaceId);
if (!access?.canSeeCosts) {
  // Remove cost fields from response
}
```

## When to Implement

Implement this when:
- [ ] Dashboard has export functionality
- [ ] Dashboard has more detailed views
- [ ] Multiple clients are actively using the system
- [ ] Cost tracking is fully operational

