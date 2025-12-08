# 🔧 Scripts Directory

This directory contains utility scripts for testing, verification, and maintenance.

## 📁 Contents

### Database Testing & Verification
- **`check-database-schema.js`** - Verify database schema structure
- **`verify-database-data.js`** - Check database data integrity
- **`test-workspace-setup.sql`** - SQL script for workspace setup testing
- **`test-campaign-dropdown.js`** - Test campaign dropdown functionality

### Queue Health Monitoring
- **`check-queue-health.sh`** - Monitor webhook queue health status

### Phase Verification Scripts
- **`verify-phase-8-complete.sh`** - Verify Phase 8 (Caching) completion
- **`verify-phase-8-step-1-2.sh`** - Verify Phase 8 steps 1-2
- **`verify-phase-8-step-3-4.sh`** - Verify Phase 8 steps 3-4
- **`verify-phase-9-batch-1.sh`** - Verify Phase 9 Batch 1 (Lazy Loading)
- **`verify-phase-9-batch-2.sh`** - Verify Phase 9 Batch 2
- **`verify-phase-9-batch-3.sh`** - Verify Phase 9 Batch 3
- **`verify-phase-9-step-1-2.sh`** - Verify Phase 9 steps 1-2
- **`verify-phase-10-migration.sh`** - Verify Phase 10 (Webhook Queue) migration
- **`test-phase-10.sh`** - Test Phase 10 functionality

## 🚀 Usage

### Running Shell Scripts
```bash
# Make executable (if needed)
chmod +x scripts/*.sh

# Run a script
./scripts/check-queue-health.sh
```

### Running Node.js Scripts
```bash
# Run database schema check
node scripts/check-database-schema.js

# Run data verification
node scripts/verify-database-data.js
```

### Running SQL Scripts
```bash
# Execute in Supabase SQL Editor or via psql
psql -h <your-host> -U <user> -d <database> -f scripts/test-workspace-setup.sql
```

## 📝 Notes

- Most phase verification scripts are historical and relate to completed development phases
- Database testing scripts require environment variables to be set (see `.env.local`)
- Queue health monitoring is useful for production debugging

## 🔗 Related

- See `supabase/scripts/` for SQL debugging and migration scripts
- See `tests/` for automated tests (Jest, Playwright)
- See `docs/` for documentation on system architecture
