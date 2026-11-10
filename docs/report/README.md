# WishWell Project Report & Academic Material Index

This directory contains the complete technical report documentation for the **WishWell** verified wish-matching platform, structured for university evaluation and viva examination defense.

---

## Report Sections Directory

| Section | Document | Summary Description |
|---|---|---|
| **1. Problem Statement** | [01_problem_statement.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/01_problem_statement.md) | Real-world problem, children's homes trust deficit, child privacy violations, and platform objectives. |
| **2. Requirements** | [02_requirements.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/02_requirements.md) | Functional Requirements by role (Public, Donor, Institution, Verifier, Admin) and Non-Functional Requirements (ACID, Privacy, Auditability). |
| **3. Architecture** | [03_architecture.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/03_architecture.md) | Multi-tier polyglot architecture, Mermaid component diagrams, and service interactions. |
| **4. API Catalog** | [04_api_list.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/04_api_list.md) | Exhaustive list of all 35 RESTful endpoints, HTTP verbs, payload models, and role permissions. |
| **5. Concurrency Trade-Off** | [05_concurrency_tradeoff.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/05_concurrency_tradeoff.md) | In-depth trade-off: Pessimistic Row Locking vs. Optimistic Concurrency, citing our real 20-client race condition benchmark. |
| **6. ER Model & 3NF Normalization** | [06_er_and_normalization.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/06_er_and_normalization.md) | Complete Mermaid ER diagram, 1NF/2NF/3NF formal proofs, and dynamic `v_open_wishes` calculation. |
| **7. Data Classification** | [07_data_classification.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/07_data_classification.md) | Structured, semi-structured, and unstructured data breakdown across Azure SQL, Cosmos DB, and Blob Storage. |
| **8. Threat Model (STRIDE)** | [08_threat_model.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/08_threat_model.md) | Assets, actors, trust boundaries, Data-Flow Diagram (DFD), and STRIDE threat mitigation matrix. |
| **9. Security Checklist** | [09_security_checklist.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/09_security_checklist.md) | Verifiable security controls mapped to exact source code lines and corresponding Azure screenshot settings. |
| **10. Testing Summary** | [10_testing_summary.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/10_testing_summary.md) | Pytest test execution results (74 passed), contract verification (35 routes), and database invariants (5 suites). |
| **11. Licenses & AI Credits** | [11_licenses_and_ai_credits.md](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/11_licenses_and_ai_credits.md) | Third-party software dependency licenses and formal declaration of AI tool usage. |

---

## Supporting Project Deliverables
- **Demonstration SQL Queries**: [`docs/queries.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/queries.sql) (5 Joins, Group By Aggregation, View query, Stored Procedure call, and ACID Claim Transaction).
- **25 Viva Examination Questions**: [`docs/viva_questions.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/viva_questions.md) (Code-referenced model answers).
- **Final QA Verification Report**: [`docs/qa_verification_report.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/qa_verification_report.md) (End-to-end 9-step flow test and performance audit).

