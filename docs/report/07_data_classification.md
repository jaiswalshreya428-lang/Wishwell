# 7. Data Classification & Storage Architecture

WishWell employs a **polyglot persistence** model to balance strict transactional consistency, high-speed telemetry, and media privacy.

---

## 7.1 Data Classification Matrix

| Category | Storage Engine & Container | Data Types & Schema | Access Control & Permissions | Encryption & Protection | Retention & Lifecycle |
|---|---|---|---|---|---|
| **Structured (Relational)** | **Microsoft SQL Server / Azure SQL Database** (`dbo.users`, `dbo.institutions`, `dbo.wishes`, `dbo.wish_claims`, `dbo.deliveries`, `dbo.audit_log`) | Fixed, strictly typed 3NF tables with primary keys, foreign keys, constraints, and SHA-256 hash chains. | FastAPI service principal via async connection; direct SQL access restricted by firewall rules; read-only `pbi_reader` user for Power BI. | - Transparent Data Encryption (TDE) at rest (AES-256)<br>- TLS 1.2+ in transit<br>- Passwords hashed via bcrypt | Retained permanently for non-repudiation and auditability; deleted only under regulatory compliance rules. |
| **Semi-Structured (NoSQL JSON)** | **Azure Cosmos DB** (Core/SQL API, Serverless)<br>- Container: `audit_events` (PK: `/entity`)<br>- Container: `delivery_metadata` (PK: `/claim_id`) | Dynamic JSON documents containing HTTP request headers, IP address, user-agent, full state diffs, and courier tracking webhooks. | Backend Managed Identity / Master Key; zero public internet access; queried through FastAPI admin endpoints. | - Azure Cosmos DB serverless encryption at rest (FIPS 140-2)<br>- HTTPS / TLS 1.2+ in transit | 12-month active retention; automated lifecycle archiving or TTL policy. |
| **Unstructured (Binary Objects)** | **Azure Blob Storage / Azurite**<br>- Container: `documents` (private)<br>- Container: `delivery-proofs` (private) | Raw binary streams (PDF registration certificates, JPEG/PNG physical delivery proof photos). | **Zero public read access** (`Private`). Access exclusively via short-lived (15-minute) signed SAS tokens minted by backend. | - Azure Storage Service Encryption (SSE) with Microsoft-managed keys<br>- HTTPS only<br>- EXIF/GPS metadata completely stripped before upload | Verification documents retained while institution is registered; proof photos retained for 3 years post-fulfillment. |

---

## 7.2 Why Polyglot Persistence?

1. **Why not store everything in SQL Server?**
   - Storing large binary PDFs and image blobs in SQL Server (`VARBINARY(MAX)`) bloats relational table spaces, degrades index seek performance, and dramatically increases backup and restore times.
   - Blob storage provides 99.999999999% (11 9's) durability at a fraction of relational database storage costs.

2. **Why not store everything in Cosmos DB?**
   - High-concurrency item claiming requires multi-row ACID transactions with row-level locks (`UPDLOCK`, `ROWLOCK`). Cosmos DB is an eventual-consistency or optimistic document database where serializing discrete counter updates across multiple documents requires complex distributed transaction orchestration.
   - SQL Server is the industry standard for strict ACID financial and inventory accounting.

3. **Why use Cosmos DB alongside SQL Server?**
   - Audit event contexts (HTTP client headers, browser versions, dynamic diff payloads) and courier webhook metadata have highly variable JSON schemas.
   - Storing JSON in Cosmos DB keeps the relational SQL `dbo.audit_log` lean, fast, and focused on cryptographic hash chaining (`prev_hash`, `record_hash`), while still linking directly to Cosmos DB via `cosmos_doc_id`.

---

## 7.3 Verification & Screenshots Checklist
- [TODO: Screenshot Azure Portal showing Blob Storage containers `documents` and `delivery-proofs` with Public access level set to "Private (no anonymous access)"]
- [TODO: Screenshot Azure Cosmos DB Data Explorer showing an item in the `audit_events` container with its partition key `/entity`]
- [TODO: Screenshot Azure SQL Database overview tab showing "Transparent Data Encryption: ON"]

