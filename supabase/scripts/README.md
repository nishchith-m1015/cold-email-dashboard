# 🗄️ Supabase Scripts

This directory contains SQL scripts for debugging, fixing, and maintaining the Supabase database.

## 📁 Contents

### Main Schema
- **`../schema.sql`** - Main database schema (222 lines)
  - All tables, views, functions, triggers, and RLS policies
  - Run this to set up a new database instance

### Debug & Fix Scripts
- **`apply_fixed_trigger.sql`** - Apply corrected trigger function
- **`fix_trigger.sql`** - Fix for webhook queue trigger
- **`check_schema.sql`** - Verify schema structure and relationships
- **`debug_materialized_view.sql`** - Debug materialized view issues

### Migrations
- **`../migrations/`** - Database migration files (see `migrations/README.md`)

## 🚀 Usage

### Running in Supabase SQL Editor

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Create new query
4. Copy-paste script contents
5. Click **Run**

### Running via psql

```bash
# Set connection details
export PGHOST=your-project.supabase.co
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=your-password

# Run a script
psql -f supabase/scripts/check_schema.sql

# Or run main schema
psql -f supabase/schema.sql
```

### Running via Supabase CLI

```bash
# Apply schema
supabase db reset

# Run specific script
supabase db execute -f supabase/scripts/check_schema.sql
```

## 📝 Script Descriptions

### `check_schema.sql`
Verifies:
- Table existence and structure
- Index definitions
- Materialized view status
- Trigger configurations
- RLS policies

### `debug_materialized_view.sql`
Debugs:
- Materialized view refresh issues
- View dependencies
- Data aggregation problems
- Performance bottlenecks

### `fix_trigger.sql` & `apply_fixed_trigger.sql`
Fixes:
- Webhook queue trigger function
- Async processing issues
- Idempotency key handling

## ⚠️ Important Notes

- **Always backup** before running fix scripts in production
- Test scripts in development environment first
- These are **debugging scripts** - main schema is in `../schema.sql`
- Migration files are in `../migrations/` directory

## 🔗 Related

- Main schema: `supabase/schema.sql`
- Migration files: `supabase/migrations/`
- Database docs: `docs/ARCHITECTURE.md`
- API reference: `docs/API_REFERENCE.md`
