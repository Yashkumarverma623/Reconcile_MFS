# Architecture & Reconciliation Engine Specification

## Overview

Reconcile is built as a **modular monolith with an asynchronous background job queue** (BullMQ + Redis).

```
                 Browser (User Interface)
                           │
                           ▼
                    Next.js Frontend (React / Tailwind / TanStack Query)
                           │
                           ▼
                      Express API (TypeScript / Node.js)
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
            PostgreSQL             Redis
            (Source of             (BullMQ Job Queue &
             Truth)                 Rate Limiting)
                 ▲                   │
                 │                   ▼
                 └───────── Reconciliation Worker (BullMQ Processor)
```

---

## Reconciliation Engine & Algorithm

1. **Dataset Ingestion & Normalization**:
   - Files (CSV, JSON) or external APIs are ingested.
   - Raw monetary values are converted to **integer minor units** (e.g., `$120.50` -> `12050` cents) to eliminate floating-point arithmetic errors.
   - Dates are standardized to UTC Date objects.
   - Within-file duplicate `external_id` instances are detected and flagged (`status: DUPLICATE`).

2. **Deterministic Matching Key**:
   - Primary key: `external_id`.
   - Secondary rules:
     - `requireAmountMatch`: Verifies `sourceA.amount === sourceB.amount`.
     - `dateToleranceSeconds`: Verifies `|sourceA.date - sourceB.date| <= tolerance`.
     - `requireCustomerMatch`: Verifies customer reference text match.

3. **Output Categories**:
   - `MATCHED`: Records agree across all active rules.
   - `MISMATCH`: Records share `external_id` but fail secondary rules. Exact field diffs recorded (`{ "amount": { "sourceA": 25000, "sourceB": 23000 } }`).
   - `MISSING_FROM_A`: Record present in Source B but absent in Source A.
   - `MISSING_FROM_B`: Record present in Source A but absent in Source B.

---

## Exception Lifecycle

```
[ Job Execution ] ──► (Discrepancy / Missing Record) ──► [ Exception Created: OPEN ]
                                                                   │
                                                                   ▼
                                                          [ Status: IN_REVIEW ]
                                                                   │
                                                                   ▼
                                                          [ Status: RESOLVED ]
                                                   (Requires Resolution Reason)
```

- History is append-only (historical exceptions are never deleted).
- Append-only comments (`ExceptionComment`) track team discussion.
