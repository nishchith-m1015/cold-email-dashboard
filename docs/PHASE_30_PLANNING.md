ACT AS: **Distinguished Technical Fellow (Level L10)** & **Systems Architect**.

**OBJECTIVE:**
Generate the "Magna Carta" for **Phase 31: God Mode (Campaign Orchestration)**.
We are building a **Remote Control System** that allows the Next.js Dashboard to drive the n8n Workflow Engine.
Output the plan to: `docs/plans/PHASE_31_ORCHESTRATION_ARCHITECTURE.md`.

**THE CORE REQUIREMENT:**
You must map the **5 Pillars of Orchestration**.
For **EACH** of these 5 pillars, you must analyze it across **15 DISTINCT TECHNICAL DIMENSIONS**.
This means the final document will contain **75 deep-dive analysis points**.

**THE CONTEXT:**
* **The Body:** Next.js Dashboard (User Interface).
* **The Engine:** n8n (Workflow Automation).
* **The Bridge:** REST API + Supabase State.
* **The Constraint:** We must maintain "Optimistic UI" state (instant clicks) while handling the "Eventual Consistency" of external API calls.

---

### **THE 5 PILLARS TO MAP:**

#### **1. The Schema Bridge (The State)**
* **Core Systems:** `supabase/schema.sql`, `campaigns` table.
* **Focus:** Storing the `n8n_workflow_id` and the `status` enum ('active', 'paused', 'archived', 'error'). How do we map 1 Campaign to 1 Workflow?

#### **2. The n8n Protocol (The Transport)**
* **Core Systems:** `lib/n8n-client.ts` (New), n8n Public API.
* **Focus:** The specific HTTP calls to Activate/Deactivate workflows. Handling Auth (`N8N_API_KEY`) and Network Timeouts.

#### **3. The Command Center (The API)**
* **Core Systems:** `app/api/campaigns/[id]/toggle/route.ts`.
* **Focus:** The secure gateway that receives the User's command, validates ownership, calls n8n, and updates the DB.

#### **4. The Optimistic Interface (The UI)**
* **Core Systems:** `components/dashboard/campaign-table.tsx`, `hooks/use-campaigns.ts`.
* **Focus:** Implementing "Optimistic Updates" (switch toggles instantly) and "Rollback" (switch flips back if API fails). The UX of "Loading States".

#### **5. The Synchronization Loop (The Truth)**
* **Core Systems:** `app/api/webhooks/n8n/status-change`, cron jobs.
* **Focus:** What happens if someone changes the status *inside* n8n directly? How do we keep Supabase in sync? (Polling? Webhooks? Trust-but-Verify?).

---

### **EXECUTION INSTRUCTIONS (The 15 Dimensions):**

For **EACH** of the 5 pillars above, write a dedicated chapter covering these **15 Technical Dimensions**:

1.  **Architectural Data Flow:** A strict sequence diagram (User -> API -> n8n -> DB).
2.  **Concurrency Model:** What if 10 users toggle 10 campaigns at once?
3.  **Idempotency Strategy:** What happens if I click "Start" twice in 1 second?
4.  **Error Recovery:** The specific "Rollback" logic if n8n returns 500.
5.  **Latency Budget:** Expected execution time (ms). (UI < 50ms, API < 500ms).
6.  **Security Boundaries:** Preventing Tenants from pausing other Tenants' workflows.
7.  **Database Schema Impact:** Exact column definitions and indexes.
8.  **Data Consistency Model:** Strong vs. Eventual Consistency strategy.
9.  **Scalability Constraints:** Can we handle 1,000 active campaigns?
10. **Observability:** What logs do we write? (Audit Trail: "User X paused Campaign Y").
11. **Type Safety:** TypeScript interfaces for the n8n API responses.
12. **Maintenance Burden:** What if the n8n API changes?
13. **Edge Cases:** What if the `n8n_workflow_id` is invalid/deleted?
14. **Cost Optimization:** Minimizing unnecessary API calls.
15. **Future Optimization:** How to move to WebSockets for real-time status.

**OUTPUT:**
Generate `docs/plans/PHASE_31_ORCHESTRATION_ARCHITECTURE.md` with this extreme level of detail.