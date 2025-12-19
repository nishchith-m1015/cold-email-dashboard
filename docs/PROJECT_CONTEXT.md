# 🧠 Cold Email Dashboard - Project Context (The "Magna Carta")

> **This contains the complete architectural DNA of the system.**

---

## 📍 Quick Start Message

ACT AS: Distinguished Systems Architect (L10) & Technical Lead.
CURRENT STATE: Phase 38 **COMPLETE** (Mobile Sovereignty).

PROJECT: High-Frequency Cold Email Orchestration Engine.

STACK: Next.js 14 (App Router), Supabase (PostgreSQL), n8n (Automation), Clerk (Auth).

REPO: https://github.com/nishchith-m1015/cold-email-dashboard

URL: https://cold-email-dashboard.vercel.app

STATUS:
COMPLETED: Phases 1-38 (Foundation → Mobile Sovereignty).

ACTIVE: Ready for Phase 39 or new initiatives.

CRITICAL CONTEXT:
Hybrid Architecture: Logic is split between Code (Next.js) and Low-Code (n8n).

Source of Truth: The leads_ohio table is the master lead record (NOT contacts).

Performance: Uses Materialized Views (mv_daily_stats) for sub-50ms analytics.

Read docs/PROJECT_CONTEXT.md for the full forensic audit.

---

## 🎯 System Architecture: The "Hybrid Engine"

**What is this?**
This is not a CRUD app. It is a **Distributed Control Plane** for an automated agency. It orchestrates thousands of cold emails, tracks financial attribution per-token, and provides real-time intelligence.

**The 4 Architectural Pillars:**

1.  **Hybrid Nervous System:**
    - **The Brain (n8n):** Handles business logic, research, decision making, and email sending.
    - **The Body (Next.js + Supabase):** Handles state, user interface, analytics aggregation, and auth.
2.  **Strict Multi-Tenancy:**
    - Data is isolated at the Row Level (RLS) using `workspace_id`.
    - Users interact via `user_workspaces` (Role-Based Access).
3.  **Zero-Latency Analytics:**
    - We do **not** query raw logs for the dashboard.
    - We use **Materialized Views** (`mv_daily_stats`) and RPC functions (`refresh_dashboard_views`) to serve pre-calculated metrics in <50ms.
4.  **Financial Forensics:**
    - Every API call (OpenAI, Relevance, etc.) is logged to `llm_usage`.
    - Costs are attributed to specific `campaign_name` and `run_id` for exact unit economics.

---

## ✅ Detailed Phase History

### 🟢 Phases 1-6: The MVP & Tracking Core

- **Email Tracking:** Implemented pixel-based Open Tracking (`/api/track/open`) and Redirect Click Tracking (`/api/track/click`).
- **Cost Tracking:** Built the `llm_usage` table to capture token usage from n8n via Webhooks.
- **Deployment:** Vercel + Supabase production environment established.

### 🟢 Phases 7-15: The "Enterprise" Pivot

- **Migration:** Moved from Google Sheets to **Supabase PostgreSQL** as the primary DB.
- **Auth Integration:** Replaced custom auth with **Clerk**.
  - _Middleware:_ `middleware.ts` protects routes and syncs Clerk user IDs.
  - _Webhooks:_ `/api/webhooks/clerk` syncs user creation to the DB.
- **RLS Implementation:** Applied Row Level Security policies to `contacts`, `email_events`, and `llm_usage` to enforce owner-only access.

### 🟢 Phases 16-20: Multi-Tenancy Deep Dive

- **Workspace Architecture:** Created `workspaces` and `user_workspaces` tables.
- **Invite System:** Built the logic for inviting members via email (`/api/workspaces/[id]/invites`).
- **Context Switching:** Built the `WorkspaceProvider` and UI Switcher to instantly toggle data contexts without reloading the page.

### 🟢 Phases 21-25: The Performance Engine

- **Materialized Views:** Created `mv_daily_stats` to cache expensive `COUNT(*)` queries on millions of events.
- **Idempotency:** Implemented the `webhook_queue` table and triggers.
  - _Logic:_ n8n sends a webhook -> DB stores in Queue -> Trigger processes it -> Deduplication ensures exactly-once execution.
- **Hyper-Speed UX:**
  - **Prefetching:** Hovering over nav links triggers SWR `mutate`.
  - **Global Search:** `Command+K` palette for instant navigation.

### 🟢 Phase 26: Leads Command Center (CRM)

- **The Master Grid:** Built `app/contacts/page.tsx` using TanStack Table (Headless).
- **Server-Side Pagination:** implemented cursor-based pagination (50 rows/load) for infinite scroll.
- **Schema Reality Check:** Confirmed `leads_ohio` is the active table.
- **UX Refinements:**
  - **Slide-Over Inspector:** Clicking a row opens a details sheet (not a new page).
  - **Industry Coloring:** Visual badges for industries (Construction=Yellow, etc.).
  - **Sorting:** Fixed default sort to `ORDER BY id ASC`.

### 🟢 Phase 27-34: Advanced Features & RBAC

- **Sequences/Dispatch Monitor:** Control tower for viewing HTML email drafts before sending.
- **Click Tracking Enhancement:** Implemented sophisticated click tracking with provider normalization.
- **Role-Based Access Control:** Comprehensive permission system (viewer/member/admin/owner).
- **Security Hardening:** Rate limiting, response sanitization, audit logging.
- **Team Management:** Full invite, role assignment, and member management system.

---

## 🟢 **Phase 35: Client Self-Service Experience Enhancement** ✅ COMPLETE

**Goal:** Transform the dashboard into a self-service platform that empowers users without requiring developer intervention.

**Implemented Features:**

### 35.1: Global Search (`Command+K`)

- Fuzzy search across campaigns, contacts, and navigation
- Keyboard shortcuts for power users
- Instant results with highlighting

### 35.2: Interactive Onboarding Tour

- Step-by-step guided tour for new users
- Contextual tooltips and highlights
- Skip/restart functionality
- localStorage persistence

### 35.3: Inline Editing

- Edit campaign names directly in tables
- Real-time validation and save
- Optimistic UI updates

### 35.4: Quick Actions Menu

- Right-click context menus on campaigns
- Duplicate, archive, pause/resume actions
- Keyboard shortcuts integration

### 35.5: Role-Based UI Adaptation

- Permission-aware components
- Dynamic feature visibility based on user role
- Graceful permission denial messaging

### 35.6: Notification Center

- Real-time notification dropdown in header
- Unread count badge
- Mark as read / dismiss actions
- Auto-polling every 30 seconds
- Types: replies, budget alerts, campaign events

### 35.7: Bulk Actions System

- Multi-select with checkboxes
- Floating action toolbar
- Bulk pause/resume/delete operations
- Permission-gated bulk delete (requires 'manage')

### 35.8: Customizable Dashboard Widgets

- Drag-and-drop widget reordering using @dnd-kit
- Toggle widget visibility
- 7 customizable widgets (metrics, charts, tables, AI)
- localStorage persistence of layout preferences
- Settings panel with reset option

### 35.9: Settings Vault Integration

- **General Settings Tab:**
  - Workspace name, timezone, auto-refresh
  - Date format (US/EU), currency selection
  - Save/load from Supabase `settings` JSONB
- **Security Settings Tab:**
  - API keys management UI (copy, revoke)
  - Webhooks configuration (placeholder)
  - 2FA and session management (placeholders)
- Permission-aware (write for general, manage for security)
- Form validation and error handling

**Technical Components Added:**

- `hooks/use-selection.ts` - Reusable selection state management
- `hooks/use-notifications.ts` - SWR-based notifications fetching
- `hooks/use-dashboard-layout.ts` - Widget customization persistence
- `hooks/use-workspace-settings.ts` - Settings CRUD operations
- `components/ui/command-palette.tsx` - Global search interface
- `components/ui/onboarding-tour.tsx` - Interactive tour system
- `components/ui/editable-text.tsx` - Inline editing component
- `components/ui/context-menu.tsx` - Right-click menu system
- `components/ui/bulk-action-toolbar.tsx` - Bulk operations UI
- `components/dashboard/dashboard-widget.tsx` - Draggable widget wrapper
- `components/dashboard/dashboard-settings-panel.tsx` - Layout customization
- `components/settings/general-settings-tab.tsx` - Workspace config
- `components/settings/security-settings-tab.tsx` - Security management
- `lib/notification-utils.ts` - Notification formatting and icons

---

## 🟢 **Phase 36: Super Admin & Governance Suite** ✅ COMPLETE

**Goal:** Platform-wide observability and control for Super Administrators.

### 36.1: Super Admin Dashboard

- Admin-only `/admin` page with workspace overview
- Cross-workspace analytics and user counts
- Workspace freeze/unfreeze controls

### 36.2: Audit Log Viewer

- Real-time activity timeline
- Role, governance, and vault audit events
- Filter by event type, date, actor

### 36.3: Workspace Governance

- Freeze functionality with reason tracking
- Automated compliance checks
- Super admin override capabilities

---

## 🟢 **Phase 37: Brand Identity & Polish** ✅ COMPLETE

**Goal:** Establish cohesive brand identity across all surfaces.

### 37.1: Logo & Branding

- Custom logo at `/public/logo.png`
- "Cold Email" title with "ANALYTICS" subtitle
- Consistent styling across header, sign-in, drawer

### 37.2: Theme Refinements

- Blue-themed gradients (replacing purple)
- Improved dark mode contrast
- Sign-out transition animation

---

## 🟢 **Phase 38: Mobile Sovereignty** ✅ COMPLETE

**Goal:** Transform dashboard into a mobile-native experience.

### 38.1: Mobile Navigation

- Bottom navigation bar (5 tabs)
- Slide-out drawer from hamburger menu
- Floating Action Button (FAB) for quick actions

### 38.2: Mobile-Responsive Pages

- Dashboard: Card stacks, collapsible widgets
- Contacts: Card-based list view with detail navigation
- Sequences: List-detail pattern, bottom sheet filters
- Settings/Admin: Dropdown tab picker on mobile

### 38.3: Mobile UX Polish

- Safe area handling for notched devices
- Touch-friendly tap targets (44px min)
- Sign-in/out pages with centered branding
- Sign-out transition overlay

**Technical Components Added:**

- `components/mobile/mobile-header.tsx` - Mobile header with logo/menu
- `components/mobile/mobile-drawer.tsx` - Slide-out navigation
- `components/mobile/bottom-nav.tsx` - Bottom tab bar
- `components/mobile/bottom-sheet.tsx` - Modal sheet component
- `components/ui/floating-action-button.tsx` - FAB component
- `components/ui/sign-out-transition.tsx` - Animated sign-out

---

## 🔮 Future Roadmap (The Golden Path)

### Phase 39: Integration Marketplace

- Zapier/Make.com connectors
- CRM integrations (HubSpot, Salesforce)
- Calendar booking links
- Slack/Discord notifications

### Phase 40: Data Export & Reporting

- CSV/Excel export functionality
- Custom report builder
- Scheduled report delivery

### Phase 41: Email Template Library

- Pre-built email templates
- Template versioning and A/B testing
- Personalization token management

---

## 🗄️ Database Schema & Forensics

### Key Tables

| Table                 | Description                               | Key Columns                                                           |
| :-------------------- | :---------------------------------------- | :-------------------------------------------------------------------- |
| **`leads_ohio`**      | **Master Lead Record**.                   | `id`, `email_address`, `full_name`, `status`, `email_1_body`...       |
| **`email_events`**    | **The Timeline**. Logs every interaction. | `event_type` (sent, opened), `campaign_name`, `provider_message_id`.  |
| **`llm_usage`**       | **Financial Ledger**.                     | `cost_usd`, `tokens_in`, `tokens_out`, `provider` (OpenAI/Anthropic). |
| **`mv_daily_stats`**  | **Performance View**.                     | `day`, `campaign_name`, `sends`, `replies` (Aggregated).              |
| **`webhook_queue`**   | **Ingestion Buffer**.                     | `idempotency_key`, `payload`, `processed` (Boolean).                  |
| **`workspaces`**      | **Tenant Isolation**.                     | `id`, `name`, `slug`, `settings` (JSONB).                             |
| **`user_workspaces`** | **RBAC Mapping**.                         | `user_id`, `workspace_id`, `role` (viewer/member/admin/owner).        |
| **`notifications`**   | **User Alerts**.                          | `type`, `title`, `message`, `is_read`, `created_at`.                  |

### Important Triggers

- **`trigger_update_daily_stats`**: Fires on `INSERT` to `email_events`. Updates the Materialized View incrementally.
- **`process_webhook_queue`**: Fires on `INSERT` to `webhook_queue`. Routes data to the correct destination tables.

---

## 📝 n8n Integration Logic

**The "Brain" (n8n) connects to the "Body" (App) via:**

1.  **Ingestion Webhook:**

    - **URL:** `https://cold-email-dashboard.vercel.app/api/events`
    - **Header:** `x-webhook-secret: [ENV_VAR]`
    - **Payload:** `{ type: 'sent', email: '...', cost: 0.002, metadata: {...} }`

2.  **Dispatch Webhook:**
    - **URL:** `https://cold-email-dashboard.vercel.app/api/hooks/draft-created`
    - **Action:** Updates `leads_ohio` with the generated HTML body.

---

## 🔐 Environment Variables

```bash
# App & Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=ey... (Required for Admin actions)

# Security
N8N_WEBHOOK_SECRET=... (Must match n8n Header)
DASH_WEBHOOK_TOKEN=... (Legacy)

# Feature Flags
NEXT_PUBLIC_ENABLE_SEQUENCES=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_ONBOARDING=true
```

---

## 🎨 UI/UX Enhancements

### Command Palette

- **Trigger:** `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- **Features:** Fuzzy search, keyboard navigation, recent items

### Onboarding

- **Storage:** localStorage key `onboarding_completed`
- **Trigger:** First visit or manual restart
- **Steps:** 5 key features walkthrough

### Notifications

- **Polling:** 30-second intervals via SWR
- **Badge:** Unread count in header bell icon
- **Actions:** Mark as read, dismiss, mark all as read

### Dashboard Customization

- **Storage:** localStorage key `dashboard_layout_v1`
- **Widgets:** 7 draggable sections
- **Reset:** One-click return to defaults

---

Last Updated: December 19, 2024
Maintained By: System Architect
**Status:** Phase 38 Complete ✅ - Ready for Phase 39
