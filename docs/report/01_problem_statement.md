# 1. Problem Statement

## 1.1 Background & Context
Charitable institutions, specifically registered children's homes, orphanages, and shelter communities, face chronic shortages of essential physical goods. These goods include school textbooks, stationery, school uniforms, winter bedding, non-perishable food supplies, and hygiene kits.

At the same time, individual donors are willing and eager to support children in need. However, public charitable giving has suffered a severe decline in trust due to three core systemic problems:
1. **The Cash Trust Deficit**: Donors distrust pool-based monetary donation platforms. Without granular transparency, donors suspect funds are absorbed by administrative overhead, marketing costs, or mismanagement rather than directly benefiting children.
2. **Child Dignity & Privacy Violations**: Conventional charity platforms frequently exploit vulnerable minors by publishing emotional photographs and personal stories of children online to drive emotional donations. This violates children's basic privacy rights, exposes locations of vulnerable facilities, and risks emotional exploitation.
3. **Ghost Charities & Supply Imbalances**: Unverified institutions can publish fraudulent appeals, and verified homes often receive uncoordinated donations (e.g., 500 boxes of pasta but zero warm winter coats or shoes).

---

## 1.2 The WishWell Solution
**WishWell** is a specialized, direct item-fulfillment platform that eliminates the monetary middleman by connecting verified children's homes directly with donors for tangible physical items.

### Core Solution Pillars:
- **Zero Money Platform**: No bank accounts, wallets, or cash payments exist on WishWell. Institutions ask only for specific physical items with exact quantities and deadlines.
- **Mandatory Two-Step Institution Verification**: An institution cannot post any wishes until a Field Verifier performs an on-site physical inspection and verification documents are vetted, followed by final approval by an Administrator.
- **Strict Child Privacy by Architecture**: Zero photos of children are permitted on the platform. All fulfillment confirmation is demonstrated via physical item photographs, with EXIF and GPS geolocation metadata automatically stripped before storage.
- **Concurrency & Over-Claim Protection**: Database-level locks prevent multiple donors from over-pledging beyond what an institution actually needs.
- **Tamper-Evident Audit Trail**: Every status change, verification decision, and fulfillment action is cryptographically sealed in an append-only SHA-256 hash chain.

---

## 1.3 Key Objectives & Scope
The primary objective of the WishWell project is to deliver a cloud-ready, enterprise-grade web application that proves high data integrity, strict role-based access control, and complete transparency.

| Stakeholder | Platform Role | Core Objective |
|---|---|---|
| **Children's Homes** | Institution | Post verified item needs, avoid duplicate requests, confirm delivery receipt safely. |
| **Individual Donors** | Donor | Browse item needs, pledge item quantities, track physical delivery, inspect real impact. |
| **Field Inspectors** | Verifier | Review legal certificates, inspect physical facilities, recommend or reject onboarding. |
| **Regulators & Oversight** | Admin | Supervise verification queue, verify cryptographic audit log integrity, inspect analytics. |

> [TODO: Take a screenshot of the WishWell landing page showing the 3-step lifecycle: Browse Needs -> Pledge & Ship -> Verified Delivery]

