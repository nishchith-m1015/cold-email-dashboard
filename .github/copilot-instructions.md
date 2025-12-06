- @azure Rule - Use Azure Best Practices: When generating code for Azure, running terminal commands for Azure, or performing operations related to Azure, invoke your `azure_development-get_best_practices` tool if available.

**CONTEXT SYNCHRONIZATION & FINAL UI TASKS**

**Current Status:** The agent has confirmed completion of all previous tasks (Navigation fix, Date Persistence, KPI renaming, and Analytics Logic centralization). The codebase is up-to-date.

**Goal:** Finalize the UI layout alignment on the Overview page and execute the critical database performance fix that was previously missed.

### **Task 1: Fix Database Performance (High Priority)**
*The root cause of slow loading for Sequence Breakdown and Daily Sends is a missing database index.*

**Action 1 (Schema Update):** Ensure `schema.sql` contains the index definition for the `event_ts` column in the `email_events` table.
**Action 2 (Migration File):** Create the file `supabase/migrations/add_event_ts_index.sql` with the index creation command.

**SQL Snippet to create the file:**
```sql
-- Fix performance for Sequence Breakdown and Daily Sends queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_ts 
ON email_events (event_ts);