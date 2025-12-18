ACT AS: **Senior Principal Security Architect (Level L10)** & **Cryptographic Engineer**.

**DEEP CONTEXT SCAN (MANDATORY)**
Before generating the security plan, you MUST read and analyze the following critical architecture files to understand our specific Multi-Tenant vulnerabilities:
1.  **The Database Logic:** `supabase/schema.sql` (Analyze current RLS policies and table isolation).
2.  **The Gatekeeper:** `middleware.ts` (Analyze how we currently enforce tenant isolation at the edge).
3.  **The Access Control:** `lib/workspace-access.ts` and `lib/api-workspace-guard.ts` (Understand our specific "Owner" vs "member" vs "Super Admin"role variables).
4.  **The Legacy Key Handler:** `lib/ask-key-store.ts` (Identify the *current* insecure way we handle keys so we can replace it).
5.  **The Usage Point:** `app/api/ask/route.ts` (See how the API key is currently consumed in the runtime).

**CONTEXT:**
We are executing **Phase 28: Security, Privacy & Encryption Hardening**.
You must generate the definitive security specification document: `docs/PHASE_28_SECURITY_ARCHITECTURE_IMPLEMENTATION.md`.

**🚨 THE ARCHITECT'S RULES (NON-NEGOTIABLE):**
1.  **NO IMPLEMENTATION CODE:** Do not write function bodies or React components. Output only Architectural Specs, SQL DDL, and Security Protocols.
2.  **ZERO TRUST MENTALITY:** Assume every input is malicious and every database dump will eventually leak.
3.  **DEPTH OVER BREADTH:** Do not give generic advice (e.g., "Use encryption"). You must provide *specific* implementation details (e.g., "Use AES-256-GCM with a 96-bit random IV").

---

### **OBJECTIVE:**
Deconstruct the application's security into **5 Core Pillars**.
For **EACH** pillar, you must analyze it across **15 DISTINCT SECURITY DIMENSIONS** (Threat Model, Latency, Error Handling, etc.).

### **THE 5 PILLARS TO MAP:**

#### **1. The Cryptographic Core (The Primitive)**
* **Target:** `lib/encryption.ts`
* **Mandate:** Define the mathematical implementation of `aes-256-gcm`. Explain why we use a 96-bit IV and 128-bit Auth Tag to prevent Oracle Padding attacks.

#### **2. The Sovereign Vault Schema (The Storage)**
* **Target:** `workspace_keys` (Postgres Table), `supabase/migrations/`
* **Mandate:** Define the schema for storing "Toxic Waste" (API Keys). Ensure that even a full `pg_dump` yields only useless ciphertext.
* **The "God Mode" Exception:** Define how the **Super Admin** (and ONLY the Super Admin) can audit this table without breaking the encryption model (e.g., they can delete/reset keys, but never view raw values).

#### **3. The Draconian Access Gate (The Policy)**
* **Target:** `RLS Policies`, `lib/workspace-access.ts`
* **Mandate:** Define strict **Owner vs. Admin** hierarchy. Admins are "Untrusted" for key management.
* **The "God Mode" Exception:** The RLS policy must explicitly include a bypass clause: `OR auth.uid() = current_setting('app.super_admin_id', true)`.

#### **4. The Ephemeral Runtime (The Ghost)**
* **Target:** `app/api/ask/route.ts`
* **Mandate:** Define the "Just-In-Time" (JIT) decryption lifecycle. The key must exist in RAM for <50ms and be garbage collected immediately. Zero logging of the decrypted value.

#### **5. The Anti-Leak Mesh (The Firewall)**
* **Target:** `app/api/workspaces`, `middleware.ts`
* **Mandate:** Define how we explicitly exclude the Vault table from generic `SELECT *` queries to prevent accidental frontend leakage.

---

### **EXECUTION INSTRUCTIONS:**
Generate `docs/PHASE_30_SECURITY_ARCHITECTURE.md`.
Organize the document by the **5 Pillars**. Inside each Pillar chapter, provide a bulleted analysis of these **15 Dimensions**:

1.  **Threat Model:** (e.g., "Rogue Admin", "SQL Injection", "Side-Channel").
2.  **Cryptographic Primitive:** (Exact algorithms/libraries).
3.  **Key Management:** (Where `INTERNAL_ENCRYPTION_KEY` lives).
4.  **Attack Vector Analysis:** (How would a hacker try to break this?).
5.  **RLS Policy Logic:** (Pseudo-code for the SQL policies).
6.  **Memory Lifecycle:** (Time-to-live in RAM).
7.  **Error Handling:** (Avoiding information leakage in 500 errors).
8.  **Audit Logs:** (What is logged vs. what is NEVER logged).
9.  **Super Admin Privileges:** (Exactly what God Mode allows).
10. **Schema Hardening:** (Unique constraints, FK cascades).
11. **Disaster Recovery:** (Protocol if Master Key is lost).
12. **Role Hierarchy:** (Owner vs Admin vs Member vs Viewer).
13. **Type Safety:** (Using Opaque Types for `EncryptedString`).
14. **Compliance:** (SOC2/GDPR alignment).
15. **Future Rotation Path:** (How to rotate keys in Phase 50).

**OUTPUT:**
Produce the full Markdown file now.