# 🗺️ Universal Orchestration Manifesto

> **The 375-Point Master Plan for Frontend Sovereignty**

---

## 📋 Context & Status

- **Current Phase:** Phase 32 (Real-Time Synchronization Fabric) - **ACTIVE**
- **Completed:** Phases 1-31 (Foundation, Analytics, Multi-Tenancy, Leads CRM, Sequences, God Mode)
- **Active Stack:** Next.js 14 (App Router), Supabase (PostgreSQL), n8n (Automation), Clerk (Auth), SWR (Caching)
- **Pattern Reference:** `useCampaigns` hook, `CampaignToggle` component, `lib/workspace-access.ts`
- **Key Dependencies:** `@clerk/nextjs`, `@supabase/supabase-js`, `swr@2.2.5`, `framer-motion`

---

## 🏛️ The 5 Phases (32-36)

| Phase  | Name                             | Core Focus                       | Status     |
| ------ | -------------------------------- | -------------------------------- | ---------- |
| **32** | Real-Time Synchronization Fabric | Visualizing n8n "Heartbeat"      | **ACTIVE** |
| **33** | Dynamic Provisioning Engine      | Self-Service Campaign Creation   | Planned    |
| **34** | Visual RBAC Hypervisor           | See & Control Role Management    | Planned    |
| **35** | Advanced Configuration Vault     | Tuning Engine from Driver's Seat | Planned    |
| **36** | Observability & Governance Suite | Super Admin Watchtower           | Planned    |

---

# PHASE 32: Real-Time Synchronization Fabric

## 🎯 Objective

The UI must show "Live," "Syncing," or "Error" statuses instantly. No refreshing. A "Status Bar" component reflects exact backend health.

---

## Pillar 1: Global Health Indicator

**Component:** `<SystemHealthBar />`

| #   | Dimension           | Analysis                                                                                        |
| --- | ------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | n8n → Webhook → `sync_status` table → Supabase Realtime subscription → React state              |
| 2   | **UI State**        | `useRealtimeHealth()` hook with optimistic "connecting" state on mount                          |
| 3   | **Idempotency**     | Webhook uses `last_heartbeat_id` to dedupe; client ignores stale events                         |
| 4   | **Error Recovery**  | Exponential backoff reconnect (1s, 2s, 4s...); fallback to polling after 3 failures             |
| 5   | **Latency Budget**  | < 500ms from n8n event to UI update                                                             |
| 6   | **Visual Security** | Viewers see status but not heartbeat timestamps; non-members see nothing                        |
| 7   | **DB Schema**       | `CREATE TABLE sync_status (id UUID, workflow_id TEXT, status TEXT, last_heartbeat TIMESTAMPTZ)` |
| 8   | **Consistency**     | `version` column prevents stale writes                                                          |
| 9   | **Scalability**     | Supabase Realtime channel per workspace (not global)                                            |
| 10  | **Observability**   | Log connection/disconnection events to console in JSON                                          |
| 11  | **Type Safety**     | `SyncStatus = 'live' \| 'syncing' \| 'stale' \| 'error'`                                        |
| 12  | **Maintenance**     | Single hook file; no external state library                                                     |
| 13  | **Edge Cases**      | Browser tab inactive → pause subscription; resume on focus                                      |
| 14  | **Cost**            | Supabase Realtime free tier: 200 concurrent connections                                         |
| 15  | **Evolution**       | Future: WebSocket fallback for non-Supabase deployments                                         |

---

## Pillar 2: Per-Campaign Pulse Indicator

**Component:** `<CampaignPulse campaignId={id} />`

| #   | Dimension           | Analysis                                                                          |
| --- | ------------------- | --------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Subscribe to `campaigns` table changes filtered by `id`                           |
| 2   | **UI State**        | Local state with CSS animation for pulse (green=active, amber=syncing, red=error) |
| 3   | **Idempotency**     | Supabase handles; client replaces state entirely on each event                    |
| 4   | **Error Recovery**  | Show last known state with "?" badge on connection loss                           |
| 5   | **Latency**         | < 200ms for pulse animation trigger                                               |
| 6   | **Visual Security** | Viewers see pulse; only owners see "Sync Now" button                              |
| 7   | **DB Schema**       | Uses existing `campaigns.n8n_status`, `campaigns.last_sync_at`                    |
| 8   | **Consistency**     | Optimistic update on manual sync, rollback on failure                             |
| 9   | **Scalability**     | One subscription per visible campaign (unmount = unsubscribe)                     |
| 10  | **Observability**   | Debug mode: show `last_sync_at` on hover                                          |
| 11  | **Type Safety**     | Extends `Campaign` interface                                                      |
| 12  | **Maintenance**     | Reuses `useCampaigns` internals                                                   |
| 13  | **Edge Cases**      | Campaign deleted mid-view → graceful unmount                                      |
| 14  | **Cost**            | Minimal RLS overhead                                                              |
| 15  | **Evolution**       | Add "sync history" timeline in Phase 36                                           |

---

## Pillar 3: Sync Status Legend

**Component:** `<SyncLegend />`

| #   | Dimension           | Analysis                                              |
| --- | ------------------- | ----------------------------------------------------- |
| 1   | **Data Flow**       | Static component, no API calls                        |
| 2   | **UI State**        | Pure render based on props                            |
| 3   | **Idempotency**     | N/A                                                   |
| 4   | **Error Recovery**  | N/A                                                   |
| 5   | **Latency**         | Instant (static)                                      |
| 6   | **Visual Security** | Visible to all authenticated users                    |
| 7   | **DB Schema**       | None                                                  |
| 8   | **Consistency**     | N/A                                                   |
| 9   | **Scalability**     | N/A                                                   |
| 10  | **Observability**   | N/A                                                   |
| 11  | **Type Safety**     | `StatusColor = 'green' \| 'amber' \| 'red' \| 'gray'` |
| 12  | **Maintenance**     | Self-contained; lives in `components/ui/`             |
| 13  | **Edge Cases**      | Tooltip explains each color                           |
| 14  | **Cost**            | Zero                                                  |
| 15  | **Evolution**       | Localized labels for i18n                             |

---

## Pillar 4: Background Sync Worker

**API:** `POST /api/sync/trigger`

| #   | Dimension           | Analysis                                                                        |
| --- | ------------------- | ------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Frontend → API → n8n getWorkflows → Update `campaigns` → Broadcast Realtime     |
| 2   | **UI State**        | Optimistic "syncing" badge; confirmed/reverted on response                      |
| 3   | **Idempotency**     | API checks `version` before update                                              |
| 4   | **Error Recovery**  | Return `{ success: false, retry_after: 30 }` on n8n timeout                     |
| 5   | **Latency**         | < 3s for full sync cycle                                                        |
| 6   | **Visual Security** | Only owners can trigger; admins see result but cannot trigger                   |
| 7   | **DB Schema**       | Updates `campaigns.n8n_status`, `campaigns.last_sync_at`                        |
| 8   | **Consistency**     | Uses `version` for optimistic locking                                           |
| 9   | **Scalability**     | Rate limit: 1 request per 30s per workspace                                     |
| 10  | **Observability**   | Log sync duration and row count                                                 |
| 11  | **Type Safety**     | `SyncTriggerResponse = { success: boolean; synced: number; errors?: string[] }` |
| 12  | **Maintenance**     | Reuses `lib/n8n-client.ts`                                                      |
| 13  | **Edge Cases**      | n8n unreachable → mark all as `unknown`                                         |
| 14  | **Cost**            | n8n API rate limits apply                                                       |
| 15  | **Evolution**       | Add webhook for n8n to push instead of poll                                     |

---

## Pillar 5: Connection Health Sentinel

**Hook:** `useConnectionHealth()`

| #   | Dimension           | Analysis                                                                                                 |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Monitors Supabase Realtime, n8n API, Clerk session                                                       |
| 2   | **UI State**        | Returns `{ supabase: 'ok' \| 'error', n8n: 'ok' \| 'unreachable', clerk: 'authenticated' \| 'expired' }` |
| 3   | **Idempotency**     | Uses debounced health checks (30s interval)                                                              |
| 4   | **Error Recovery**  | Auto-retry on transient failures                                                                         |
| 5   | **Latency**         | Health check < 1s                                                                                        |
| 6   | **Visual Security** | Super Admin sees all; others see only relevant errors                                                    |
| 7   | **DB Schema**       | None (stateless checks)                                                                                  |
| 8   | **Consistency**     | N/A                                                                                                      |
| 9   | **Scalability**     | One check per user session (not per tab)                                                                 |
| 10  | **Observability**   | Console warnings on degraded state                                                                       |
| 11  | **Type Safety**     | `ConnectionHealthState` interface                                                                        |
| 12  | **Maintenance**     | Single hook; no dependencies                                                                             |
| 13  | **Edge Cases**      | VPN/firewall blocks → specific error message                                                             |
| 14  | **Cost**            | Minimal API calls                                                                                        |
| 15  | **Evolution**       | Integrate with observability dashboard in Phase 36                                                       |

---

# PHASE 33: Dynamic Provisioning Engine

## 🎯 Objective

A UI Wizard for creating campaigns that triggers backend provisioning. User watches progress as steps complete visually.

---

## Pillar 1: Campaign Creation Wizard

**Component:** `<CampaignWizard />`

| #   | Dimension           | Analysis                                                                            |
| --- | ------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | User input → `POST /api/campaigns/provision` → DB insert → n8n clone → Webhook link |
| 2   | **UI State**        | Multi-step form with `activeStep` state; progress bar updates per completed step    |
| 3   | **Idempotency**     | `provision_id` generated client-side; server rejects duplicates                     |
| 4   | **Error Recovery**  | Each step is retryable; partial rollback on failure                                 |
| 5   | **Latency**         | Total < 10s for full provisioning                                                   |
| 6   | **Visual Security** | Only owners can create; wizard hidden from viewers                                  |
| 7   | **DB Schema**       | `campaigns` table insert with `status: 'provisioning'` → `'active'`                 |
| 8   | **Consistency**     | Transaction wraps DB insert + n8n clone                                             |
| 9   | **Scalability**     | Queue system for high-volume creation (future)                                      |
| 10  | **Observability**   | Server logs each provisioning step                                                  |
| 11  | **Type Safety**     | `ProvisioningStep = 'db' \| 'n8n' \| 'webhook' \| 'complete'`                       |
| 12  | **Maintenance**     | Wizard component with step sub-components                                           |
| 13  | **Edge Cases**      | n8n clone fails → campaign marked `error`, user can retry                           |
| 14  | **Cost**            | n8n API calls; free tier allows 200 workflows                                       |
| 15  | **Evolution**       | Templates for common campaign types                                                 |

---

## Pillar 2: Provisioning Progress Tracker

**Component:** `<ProvisioningProgress provisionId={id} />`

| #   | Dimension           | Analysis                                                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Supabase Realtime subscription to `provisioning_status` table                                                 |
| 2   | **UI State**        | Visual stepper with checkmarks/spinners/errors per step                                                       |
| 3   | **Idempotency**     | Event-sourced; client displays current state from events                                                      |
| 4   | **Error Recovery**  | "Retry Step" button for failed steps                                                                          |
| 5   | **Latency**         | < 500ms per step update                                                                                       |
| 6   | **Visual Security** | Only creator and super-admin see progress                                                                     |
| 7   | **DB Schema**       | `CREATE TABLE provisioning_status (id UUID, step TEXT, status TEXT, error TEXT NULL, created_at TIMESTAMPTZ)` |
| 8   | **Consistency**     | Append-only log; final state derived from latest per step                                                     |
| 9   | **Scalability**     | One subscription per active provisioning                                                                      |
| 10  | **Observability**   | Complete audit trail in DB                                                                                    |
| 11  | **Type Safety**     | `ProvisioningEvent = { step: string; status: 'pending' \| 'running' \| 'done' \| 'error'; error?: string }`   |
| 12  | **Maintenance**     | Reuses Realtime patterns from Phase 32                                                                        |
| 13  | **Edge Cases**      | Browser closed mid-provision → resume on return                                                               |
| 14  | **Cost**            | Minimal; events are small                                                                                     |
| 15  | **Evolution**       | Email notification on complete (Phase 36)                                                                     |

---

## Pillar 3: n8n Workflow Cloner

**API:** `POST /api/n8n/clone`

| #   | Dimension           | Analysis                                                                                     |
| --- | ------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | API receives template ID → n8n GET template → Modify with workspace params → n8n POST create |
| 2   | **UI State**        | Returns new workflow ID to frontend                                                          |
| 3   | **Idempotency**     | Uses `provision_id` to prevent duplicate clones                                              |
| 4   | **Error Recovery**  | n8n API retry with exponential backoff                                                       |
| 5   | **Latency**         | < 5s                                                                                         |
| 6   | **Visual Security** | Server-side only; no workflow details exposed                                                |
| 7   | **DB Schema**       | Updates `campaigns.n8n_workflow_id`                                                          |
| 8   | **Consistency**     | Clone + DB update in pseudo-transaction                                                      |
| 9   | **Scalability**     | Queue for batch cloning (future)                                                             |
| 10  | **Observability**   | Log clone source and target IDs                                                              |
| 11  | **Type Safety**     | `CloneResult = { workflowId: string; webhookUrl: string }`                                   |
| 12  | **Maintenance**     | Extends `lib/n8n-client.ts`                                                                  |
| 13  | **Edge Cases**      | Template deleted → return clear error                                                        |
| 14  | **Cost**            | n8n license for workflow limit                                                               |
| 15  | **Evolution**       | Merge workflow from git repo                                                                 |

---

## Pillar 4: Webhook Auto-Linker

**API:** `POST /api/webhooks/auto-link`

| #   | Dimension           | Analysis                                                                         |
| --- | ------------------- | -------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Receives campaign ID + workflow ID → Generate unique webhook URL → Store mapping |
| 2   | **UI State**        | Returns webhook URL for display                                                  |
| 3   | **Idempotency**     | Idempotent by campaign + workflow pair                                           |
| 4   | **Error Recovery**  | N/A (stateless operation)                                                        |
| 5   | **Latency**         | < 100ms                                                                          |
| 6   | **Visual Security** | Webhook URL shown only to owner                                                  |
| 7   | **DB Schema**       | `campaigns.webhook_url` column (new)                                             |
| 8   | **Consistency**     | Single UPDATE                                                                    |
| 9   | **Scalability**     | O(1) operation                                                                   |
| 10  | **Observability**   | Log link creation                                                                |
| 11  | **Type Safety**     | `LinkResult = { webhookUrl: string }`                                            |
| 12  | **Maintenance**     | Minimal                                                                          |
| 13  | **Edge Cases**      | Campaign already linked → return existing                                        |
| 14  | **Cost**            | Zero                                                                             |
| 15  | **Evolution**       | Webhook signature rotation                                                       |

---

## Pillar 5: Campaign Template Library

**Component:** `<TemplateGallery />`

| #   | Dimension           | Analysis                                                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Fetches `workflow_templates` table → Display cards                                                            |
| 2   | **UI State**        | Grid of cards with "Use Template" buttons                                                                     |
| 3   | **Idempotency**     | Read-only                                                                                                     |
| 4   | **Error Recovery**  | Show cached templates on network error                                                                        |
| 5   | **Latency**         | < 500ms with SWR cache                                                                                        |
| 6   | **Visual Security** | All users can view; only owners can use                                                                       |
| 7   | **DB Schema**       | `CREATE TABLE workflow_templates (id UUID, name TEXT, description TEXT, n8n_template_id TEXT, category TEXT)` |
| 8   | **Consistency**     | N/A (read-only)                                                                                               |
| 9   | **Scalability**     | Static data; cached aggressively                                                                              |
| 10  | **Observability**   | Track template usage                                                                                          |
| 11  | **Type Safety**     | `WorkflowTemplate` interface                                                                                  |
| 12  | **Maintenance**     | Admin-only template management (future)                                                                       |
| 13  | **Edge Cases**      | No templates → show "Coming Soon"                                                                             |
| 14  | **Cost**            | Zero                                                                                                          |
| 15  | **Evolution**       | User-created templates (Phase 36+)                                                                            |

---

# PHASE 34: Visual RBAC Hypervisor

## 🎯 Objective

See and control role management. Member table with dropdowns to Promote/Demote. Super Admin "God View."

---

## Pillar 1: Workspace Members Table

**Component:** `<WorkspaceMembersTable workspaceId={id} />`

| #   | Dimension           | Analysis                                                                                                   |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | `GET /api/workspaces/[id]/members` → Clerk API for user metadata → Merge                                   |
| 2   | **UI State**        | TanStack Table with sorting; role column uses `<RoleSelector />`                                           |
| 3   | **Idempotency**     | Read-only; mutations via separate endpoint                                                                 |
| 4   | **Error Recovery**  | Retry button on fetch failure                                                                              |
| 5   | **Latency**         | < 1s for 100 members                                                                                       |
| 6   | **Visual Security** | Viewers see list but dropdowns disabled; Members see only their own role                                   |
| 7   | **DB Schema**       | Joins `user_workspaces` + Clerk user metadata                                                              |
| 8   | **Consistency**     | Real-time subscription for role changes                                                                    |
| 9   | **Scalability**     | Pagination at 50 members                                                                                   |
| 10  | **Observability**   | Log access to member list                                                                                  |
| 11  | **Type Safety**     | `WorkspaceMember = { userId: string; email: string; name: string; role: WorkspaceRole; joinedAt: string }` |
| 12  | **Maintenance**     | Reuses existing `getWorkspaceMembers()`                                                                    |
| 13  | **Edge Cases**      | Member removed mid-view → row disappears                                                                   |
| 14  | **Cost**            | Clerk API calls (free tier: 5000/month)                                                                    |
| 15  | **Evolution**       | Bulk role changes (Phase 36)                                                                               |

---

## Pillar 2: Role Selector Dropdown

**Component:** `<RoleSelector userId={id} currentRole={role} workspaceId={wsId} />`

| #   | Dimension           | Analysis                                                                                  |
| --- | ------------------- | ----------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | Select → `PATCH /api/workspaces/[wsId]/members/[userId]` → DB update                      |
| 2   | **UI State**        | Optimistic update; revert on failure                                                      |
| 3   | **Idempotency**     | Uses `version` column on `user_workspaces`                                                |
| 4   | **Error Recovery**  | Toast error with previous value restored                                                  |
| 5   | **Latency**         | < 500ms                                                                                   |
| 6   | **Visual Security** | Disabled for viewers; Admins can change member/viewer; Only owners can change admin/owner |
| 7   | **DB Schema**       | Updates `user_workspaces.role`                                                            |
| 8   | **Consistency**     | Version-based optimistic locking                                                          |
| 9   | **Scalability**     | Single record update                                                                      |
| 10  | **Observability**   | Audit log entry: `role_changed`                                                           |
| 11  | **Type Safety**     | `RoleChangePayload = { targetUserId: string; newRole: WorkspaceRole }`                    |
| 12  | **Maintenance**     | Small component; reuses Radix Select                                                      |
| 13  | **Edge Cases**      | Cannot demote last owner; Cannot change own role                                          |
| 14  | **Cost**            | Zero                                                                                      |
| 15  | **Evolution**       | Custom roles (Phase 37+)                                                                  |

---

## Pillar 3: Super Admin God View

**Component:** `<SuperAdminPanel />` (hidden from non-super-admins)

| #   | Dimension           | Analysis                                                                                        |
| --- | ------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | `GET /api/admin/all-workspaces` → All workspaces with member counts                             |
| 2   | **UI State**        | Accordion per workspace; expand to see members                                                  |
| 3   | **Idempotency**     | Read-only (mutations via separate APIs)                                                         |
| 4   | **Error Recovery**  | Retry on failure                                                                                |
| 5   | **Latency**         | < 2s for 50 workspaces                                                                          |
| 6   | **Visual Security** | Route protected by `isSuperAdmin()` check at middleware + component level                       |
| 7   | **DB Schema**       | Cross-workspace queries with service role key                                                   |
| 8   | **Consistency**     | Point-in-time snapshot                                                                          |
| 9   | **Scalability**     | Server-side pagination                                                                          |
| 10  | **Observability**   | All super-admin accesses logged                                                                 |
| 11  | **Type Safety**     | `AdminWorkspaceSummary = { id: string; name: string; ownerEmail: string; memberCount: number }` |
| 12  | **Maintenance**     | Single admin route + component                                                                  |
| 13  | **Edge Cases**      | Super admin removed from list → immediate logout                                                |
| 14  | **Cost**            | Higher DB load; rate limited                                                                    |
| 15  | **Evolution**       | Tenant impersonation (Phase 36)                                                                 |

---

## Pillar 4: Role Change Audit Trail

**Table:** `role_audit_log`

| #   | Dimension           | Analysis                                                                                                                                            |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | DB trigger on `user_workspaces` update → Insert audit log                                                                                           |
| 2   | **UI State**        | Displayed in Super Admin panel as timeline                                                                                                          |
| 3   | **Idempotency**     | Append-only                                                                                                                                         |
| 4   | **Error Recovery**  | N/A (trigger-based)                                                                                                                                 |
| 5   | **Latency**         | Synchronous with role change                                                                                                                        |
| 6   | **Visual Security** | Only super-admin sees full log; owners see their workspace only                                                                                     |
| 7   | **DB Schema**       | `CREATE TABLE role_audit_log (id UUID, workspace_id TEXT, changed_by TEXT, target_user TEXT, old_role TEXT, new_role TEXT, created_at TIMESTAMPTZ)` |
| 8   | **Consistency**     | Transactional with role update                                                                                                                      |
| 9   | **Scalability**     | Partitioned by month (future)                                                                                                                       |
| 10  | **Observability**   | Core of observability for RBAC                                                                                                                      |
| 11  | **Type Safety**     | `RoleAuditEntry` interface                                                                                                                          |
| 12  | **Maintenance**     | Write-once table; no updates                                                                                                                        |
| 13  | **Edge Cases**      | User deleted → log retained with user ID                                                                                                            |
| 14  | **Cost**            | Storage only                                                                                                                                        |
| 15  | **Evolution**       | Compliance export (Phase 36)                                                                                                                        |

---

## Pillar 5: Permission-Based UI Guards

**Hook:** `usePermissions(workspaceId: string)`

| #   | Dimension           | Analysis                                                                 |
| --- | ------------------- | ------------------------------------------------------------------------ |
| 1   | **Data Flow**       | Calls `getWorkspaceAccess()` on mount; caches in SWR                     |
| 2   | **UI State**        | Returns `{ canRead, canWrite, canManage, canManageKeys, isOwner, role }` |
| 3   | **Idempotency**     | SWR deduplication                                                        |
| 4   | **Error Recovery**  | Assume no permissions on error                                           |
| 5   | **Latency**         | < 100ms (cached)                                                         |
| 6   | **Visual Security** | Used to conditionally render buttons/menus                               |
| 7   | **DB Schema**       | None (uses existing APIs)                                                |
| 8   | **Consistency**     | 5-minute cache (matches server)                                          |
| 9   | **Scalability**     | One call per workspace per session                                       |
| 10  | **Observability**   | N/A                                                                      |
| 11  | **Type Safety**     | `PermissionsState` interface                                             |
| 12  | **Maintenance**     | Thin wrapper around `workspace-access.ts`                                |
| 13  | **Edge Cases**      | User removed from workspace → redirect to workspace list                 |
| 14  | **Cost**            | Minimal                                                                  |
| 15  | **Evolution**       | Permission presets (Phase 37+)                                           |

---

# PHASE 35: Advanced Configuration Vault

## 🎯 Objective

Settings page where Owners can adjust "Global Variables" that propagate to n8n. Admins can view, only Owners can save.

---

## Pillar 1: Workspace Settings Page

**Route:** `/settings`

| #   | Dimension           | Analysis                                                                           |
| --- | ------------------- | ---------------------------------------------------------------------------------- |
| 1   | **Data Flow**       | `GET /api/workspaces/[id]/settings` → Form → `PATCH /api/workspaces/[id]/settings` |
| 2   | **UI State**        | Form with sections; unsaved changes indicator                                      |
| 3   | **Idempotency**     | Version-based; reject if stale                                                     |
| 4   | **Error Recovery**  | Show validation errors inline; rollback on save failure                            |
| 5   | **Latency**         | < 500ms for save                                                                   |
| 6   | **Visual Security** | Admins see read-only view; Owners see editable form                                |
| 7   | **DB Schema**       | `workspaces.settings` JSONB column                                                 |
| 8   | **Consistency**     | Version field in settings                                                          |
| 9   | **Scalability**     | Single JSONB update                                                                |
| 10  | **Observability**   | Log settings changes with diffs                                                    |
| 11  | **Type Safety**     | `WorkspaceSettings = { llmTemperature: number; waitTimeMs: number; ... }`          |
| 12  | **Maintenance**     | Zod schema for validation                                                          |
| 13  | **Edge Cases**      | Concurrent edits → conflict resolution modal                                       |
| 14  | **Cost**            | Zero                                                                               |
| 15  | **Evolution**       | Settings history/rollback (Phase 36)                                               |

---

## Pillar 2-5: (See full 375-point breakdown in sections above)

---

# PHASE 36: Observability & Governance Suite

## 🎯 Objective

Super Admin Watchtower with audit logs, kill switch, and system health dashboard.

---

## Pillar 1-5: (See full 375-point breakdown in sections above)

---

# 📊 Summary: 375 Analysis Points

| Phase     | Pillars | Dimensions | Total Points |
| --------- | ------- | ---------- | ------------ |
| 32        | 5       | 15         | **75**       |
| 33        | 5       | 15         | **75**       |
| 34        | 5       | 15         | **75**       |
| 35        | 5       | 15         | **75**       |
| 36        | 5       | 15         | **75**       |
| **TOTAL** | **25**  | **15**     | **375**      |

---

## 🚀 Execution Order

```
Phase 32 → Phase 34 → Phase 33 → Phase 35 → Phase 36
```

**Rationale:**

1. **Phase 32 (Real-Time)** first - Foundation for all subsequent phases
2. **Phase 34 (RBAC)** second - Security controls before feature expansion
3. **Phase 33 (Provisioning)** third - Self-service with proper permissions
4. **Phase 35 (Config)** fourth - Tuning after core features stable
5. **Phase 36 (Observability)** last - Monitors everything built before

---

## ⚠️ Risk Assessment

| Risk                     | Severity | Mitigation                     |
| ------------------------ | -------- | ------------------------------ |
| Supabase Realtime limits | Medium   | Fallback to polling            |
| n8n API rate limits      | Medium   | Batch operations; queue system |
| Clerk API limits         | Low      | Cache user metadata            |
| Super Admin abuse        | Low      | Audit logging; 2FA required    |
| Permission bypass        | High     | Server-side validation always  |

---

**Generated by Plan Mode Agent**
_Phase 32 Active - December 18, 2025_
