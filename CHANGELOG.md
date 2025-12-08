# Changelog

All notable changes to the Cold Email Analytics Dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-08

### 🎉 Major Release - Production Ready

This release marks the completion of all core features, multi-tenant architecture, comprehensive testing, and complete documentation overhaul. The dashboard is now production-ready with enterprise-grade features.

### Added

#### Phase 11-12: Multi-Tenant Architecture & Authentication
- **Clerk Authentication**: Secure multi-tenant authentication with sign-in/sign-up pages
- **Workspace System**: Complete data isolation per organization
- **Role-Based Access**: Admin, Member, and Viewer roles
- **Workspace Invites**: Team collaboration with granular permissions
- **Row Level Security**: Database-enforced data isolation via Supabase RLS

#### Phase 13: Error Handling & Monitoring
- **Error Boundaries**: Wrapped all major components for graceful error recovery
- **Fallback UI**: User-friendly error messages with retry functionality
- **Error Logging**: Comprehensive error tracking for debugging
- **Safe Components**: Exported error-boundary-wrapped components

#### Phase 14: Testing Infrastructure
- **Unit Tests**: 83 tests with 88-91% code coverage using Jest + React Testing Library
- **E2E Tests**: 12 Playwright tests (9 passing, 75% pass rate) covering critical user paths
- **CI-Ready**: GitHub Actions configuration for automated testing
- **Mock Auth**: Playwright test fixtures with Clerk auth bypass
- **Test Commands**: Watch mode, coverage, headless, UI, and debug modes

#### Phase 15: Documentation & Handover
- **Environment Setup**: Complete `.env.local.example` template with all 12 variables
- **Environment Guide**: Comprehensive `docs/ENVIRONMENT_VARIABLES.md` (350+ lines)
- **README Rewrite**: New README with architecture diagram, features, setup guide
- **Documentation Index**: `docs/README.md` navigation with quick links
- **Contributing Guide**: `CONTRIBUTING.md` with coding standards and PR process
- **Project Context Update**: Marked all Phases 1-15 complete
- **Documentation Cleanup**: Archived 12 obsolete files to `docs/archive/`

#### Features
- **Architecture Diagram**: Mermaid diagram visualizing complete system data flow
- **Performance Metrics**: Documented 10-30x query improvements from materialized views
- **Security Best Practices**: Comprehensive security warnings and token generation guides
- **Troubleshooting**: Common issues and solutions documented
- **Quick Start**: 5-minute setup guide from clone to running dashboard

### Changed

#### Performance
- **Materialized Views**: Pre-aggregated data for sub-100ms API responses
- **SWR Caching**: 10-second deduplication prevents redundant requests
- **Lazy Loading**: Code-split chart components reduce bundle size by 30%
- **Database Indexes**: Added `idx_email_events_event_ts` for time-based queries

#### Developer Experience
- **Environment Variables**: Increased from 4 to 12 with complete documentation
- **Tech Stack**: Updated to include SWR, Clerk, Materialized Views, Testing frameworks
- **Project Structure**: Reorganized docs/ directory for better navigation
- **Package Metadata**: Updated package.json with description, keywords, repository links

### Fixed

- **Sequence Breakdown**: Added missing `event_ts` index for 10x faster queries
- **Daily Sends Chart**: Improved performance with database-level optimizations
- **Documentation Links**: Updated all cross-references between docs
- **Timezone Handling**: Consistent timezone support across all charts

### Removed

- **Obsolete Documentation**: Moved 12 outdated files to `docs/archive/`:
  - `PERFORMANCE OPTIMIZATION REQUEST.md`
  - `IMPLEMENTATION_PLAN.md`
  - `FUTURE_ROLE_HIERARCHY.md`
  - `SESSION_CHANGELOG.md`
  - `UI_IMPROVEMENTS_PLAN.md`
  - `PHASE_14_BATCH_3_E2E_PROGRESS.md`
  - `PHASE_7B_COMPLETE.md`
  - `PHASE_7B_MATERIALIZED_VIEWS.md`
  - `N8N_WORKFLOW_FIXES.md`
  - `SETUP_COMPLETE.md`
  - `START_HERE.md`
  - `COST_TRACKING_IMPLEMENTATION_TRANSCRIPT.md`

---

## [1.0.0] - 2025-12-07

### 🎉 Initial Production Release

### Added

#### Phase 1: Email Event Tracking
- Historical data backfill (486 emails imported)
- Real-time tracking for Email 1, 2, 3 workflows
- Opt-out tracking
- Supabase `email_events` table

#### Phase 2: LLM Cost Tracking (100% Accurate)
- HTTP Request nodes for exact token counts
- Services tracked: OpenAI (o3-mini, GPT-4o), Anthropic (Claude Sonnet 4.5), Relevance AI, Google CSE, Apify
- Cost events stored in Supabase `llm_usage` table
- Webhook endpoint: `/api/cost-events`

#### Phase 3: Dashboard UI
- Overview page with key metrics
- Analytics page with LLM cost charts
- Cost by provider and purpose breakdowns
- Timezone selector (synced to localStorage)
- Ask AI feature for natural language queries
- Date range picker

#### Phase 4: Reply Rate Tracking
- Gmail Trigger workflow (`Reply Tracker.json`)
- Automatic reply detection and logging
- Lead status updates in Google Sheets

#### Phase 5: Click Rate Tracking
- `/api/track/open` - Tracking pixel endpoint (1x1 GIF)
- `/api/track/click` - Link redirect endpoint with logging
- `Email Tracking Injector.json` - n8n code node to inject tracking
- Click rate displayed on Overview dashboard
- Time series chart for click trends

#### Phase 6: Production Deployment
- Deployed to Vercel: `https://cold-email-dashboard.vercel.app`
- GitHub repo: `https://github.com/nishchith-m1015/cold-email-dashboard`
- Environment variables configured
- All 7 n8n workflows updated with Vercel URL

#### Phase 7: Database Materialization
- **Materialized Views**: `mv_daily_stats` and `mv_llm_cost`
- **Admin API**: `/api/admin/refresh-views` endpoint
- **Vercel Cron**: Daily refresh at midnight UTC
- **Performance**: API response time reduced from ~800ms to <100ms (10-30x improvement)

#### Phase 8: Advanced Caching Strategy
- **SWR Configuration**: Global config with 10s deduplication interval
- **Aggregate API**: `/api/dashboard/aggregate` bundles multiple queries
- **Client Caching**: `useDashboardData` hook with `keepPreviousData: true`
- **Navigation Optimization**: Instant tab switching

#### Phase 9: UI/UX Enhancements
- **Command Palette**: ⌘K quick navigation
- **Lazy Loading**: Code-split chart components
- **Dark Theme**: Eye-friendly design with smooth animations
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Loading States**: Skeleton loaders

#### Phase 10: Webhook Queue & Idempotency
- **Async Queue**: `webhook_queue` table with trigger function
- **Idempotency Keys**: `X-Idempotency-Key` header support
- **Duplicate Prevention**: Hash-based deduplication
- **Background Processing**: 100+ events/second capacity

### Fixed

- Date timezone shifts in charts
- Y-axis label cutoff in cost charts
- Fuzzy model name matching for pricing
- Campaign filtering (case-insensitive)
- "Contacts Reached" metric accuracy

---

## Future Releases

### [2.1.0] - Planned

**Phase 16: Advanced Analytics**
- AI-powered insights and recommendations
- Predictive modeling for reply rates
- A/B testing framework
- Custom report builder

### [3.0.0] - Planned

**Phase 17: Performance Monitoring**
- Real-time performance metrics
- Error tracking (Sentry integration)
- Usage analytics
- Cost optimization alerts

**Phase 18: Integration Expansion**
- Slack notifications
- Zapier integration
- API webhooks for external tools
- Export to CSV/Excel

---

## Version History

- **v2.0.0** (2025-12-08) - Production ready with multi-tenancy, testing, and complete documentation
- **v1.0.0** (2025-12-07) - Initial production release with core features
- **v0.1.0** (2025-12-01) - Initial development version

---

## Links

- [GitHub Repository](https://github.com/nishchith-m1015/cold-email-dashboard)
- [Production Dashboard](https://cold-email-dashboard.vercel.app)
- [Documentation](docs/README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Project Context](docs/PROJECT_CONTEXT.md)
