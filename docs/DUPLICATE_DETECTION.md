# Explainable Duplicate-Need Detection Algorithm

This document explains the mathematical model, design choices, and implementation details of the duplicate-need detection engine in **WishWell**. It is specifically structured to prepare the student for technical evaluation examinations and technical defense.

---

## 1. Problem Definition & Objectives

Children's homes frequently have multiple staff members, teachers, or house coordinators identifying needs. Without automated safeguards, multiple users may unknowingly post redundant requests for identical physical supplies (e.g., "A4 Math Notebooks" vs. "Spiral Notebooks A4 (Math)").

### Key System Requirements
1. **Scope:** Scoped strictly to the **same institution** and the **same category** for **open wishes** (`status IN ('open', 'partially_claimed')`).
2. **Deterministic & Explainable:** Strictly avoids opaque Machine Learning or neural embeddings. Must be expressible in plain set theory and string normalization.
3. **Soft-Block Warning:** When potential duplicates are detected, return `HTTP 409 Conflict` with the list of similar wishes.
4. **Override Guarantee:** If the institution confirms that the need is indeed distinct or intentional (e.g. for a different grade), they supply `confirm_duplicate: true` in the JSON body to bypass the warning.

---

## 2. Why Rule-Based Set Theory Over Machine Learning?

In university technical evaluation and academic defense, examiners frequently scrutinize why complex AI/ML was or was not used. The rationale is as follows:

| Factor | Rule-Based Token Overlap (WishWell) | ML / Neural Embeddings (e.g., BERT, Word2Vec) |
|---|---|---|
| **Determinism** | 100% deterministic and mathematically auditable. | Stochastic / black-box embeddings with opaque cosine distances. |
| **Explainability (technical evaluation)** | Step-by-step token sets and Jaccard intersection can be calculated by hand on a whiteboard. | Cannot explain why two arbitrary 768-dimension vectors crossed a cosine threshold without high-dimensional projection tools. |
| **Compute Overhead** | Zero GPU, zero model inference latency ($O(\|A\| + \|B\|)$ runtime). | Requires PyTorch/TensorFlow, model weights (100MB-500MB), and inference latency. |
| **Cold Start / Data Needs** | Operates immediately with zero training data. | Requires fine-tuning on domain-specific e-commerce / donation data. |
| **False Positives Control** | Deterministic threshold ($\ge 0.5$) with transparent token attribution. | Susceptible to semantic drift (e.g., confusing "Toothbrush" with "Toothpaste" due to shared hygiene context). |

---

## 3. Algorithm Stages

The algorithm runs in three deterministic stages:

### Stage 1: Text Normalization
Every input string is sanitized to eliminate trivial variations caused by capitalization, punctuation, and extra spacing:
1. **Case folding:** All characters are converted to lowercase.
2. **Punctuation removal:** Regular expression `[^\w\s]` replaces punctuation with space (ensuring hyphenated or comma-separated terms like `spiral-bound` are treated as separate tokens rather than merged strings).
3. **Whitespace canonicalization:** Trailing, leading, and internal runs of spaces are collapsed into single space delimiters.

```python
# Example:
"Puffin Classic, Story Books!" -> "puffin classic story books"
```

### Stage 2: Exact Normalized Match
If the normalized candidate string equals the normalized existing string:
$$\text{Similarity} = 1.0 \quad (\text{Exact Match})$$

### Stage 3: Jaccard Token Overlap & Subset Containment
The normalized string is tokenized into a unique word set:
$$A = \text{tokens}(\text{candidate item name})$$
$$B = \text{tokens}(\text{existing item name})$$

#### Jaccard Similarity Index
The Jaccard index measures the ratio of shared vocabulary to the total distinct vocabulary:
$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

#### Subset Containment Boost
If a user enters a more general keyword that is completely contained within a more descriptive title (e.g., $A = \{\text{geometry}, \text{box}\}$ and $B = \{\text{camlin}, \text{geometry}, \text{box}, \text{set}\}$):
$$\text{Containment}(A, B) = \frac{|A \cap B|}{\min(|A|, |B|)}$$
$$\text{Effective Score} = \max(J(A, B), \text{Containment}(A, B) \times 0.8)$$

#### Decision Boundary
- If $\text{Effective Score} \ge 0.5$, a duplicate warning is triggered.
- If $\text{Effective Score} < 0.5$, the item is considered distinct.

---

## 4. Concrete technical evaluation Walkthrough Examples

### Example A: Token Reordering
- **Existing Item:** *"Camlin Geometry Instrument Box Set"*
  - $A = \{\text{camlin}, \text{geometry}, \text{instrument}, \text{box}, \text{set}\}$ ($|A| = 5$)
- **Candidate Item:** *"Geometry Instrument Box Camlin"*
  - $B = \{\text{geometry}, \text{instrument}, \text{box}, \text{camlin}\}$ ($|B| = 4$)
- **Intersection ($A \cap B$):** $\{\text{camlin}, \text{geometry}, \text{instrument}, \text{box}\}$ ($4$ tokens)
- **Union ($A \cup B$):** $\{\text{camlin}, \text{geometry}, \text{instrument}, \text{box}, \text{set}\}$ ($5$ tokens)
- **Jaccard Score:** $\frac{4}{5} = 0.80 \ge 0.5$
- **Result:** **TRIGGER 409 WARNING** (`"Token overlap (80% similarity, shared words: box, camlin, geometry, instrument)"`).

### Example B: Punctuation & Casing Variation
- **Existing Item:** *"Puffin Classic Story Books"*
- **Candidate Item:** *"puffin classic, story books!"*
- **Normalized Existing:** `"puffin classic story books"`
- **Normalized Candidate:** `"puffin classic story books"`
- **Result:** **TRIGGER 409 WARNING** (`"Exact normalized item name match"`, score = $1.0$).

### Example C: Unrelated Item in Same Category
- **Existing Item:** *"Oxford Mathematics Notebooks"* ($A = \{\text{oxford}, \text{mathematics}, \text{notebooks}\}$)
- **Candidate Item:** *"Drawing Pencils 2B"* ($B = \{\text{drawing}, \text{pencils}, \text{2b}\}$)
- **Intersection ($A \cap B$):** $\emptyset$ ($0$ tokens)
- **Jaccard Score:** $0.0 < 0.5$
- **Result:** **ALLOWED** (Wish created immediately with HTTP 201).

---

## 5. API Warning & Confirmation Contract

### Trigger Response (HTTP 409 Conflict)
```json
{
  "detail": {
    "message": "Potential duplicate wish detected. Similar open wishes already exist in this category for your institution.",
    "duplicate_detected": true,
    "similar_wishes": [
      {
        "id": 12,
        "title": "Middle School Geometry Sets",
        "item_name": "Camlin Geometry Instrument Box Set",
        "qty_requested": 30,
        "status": "open",
        "similarity_score": 0.8,
        "match_reason": "Token overlap (80% similarity, shared words: box, camlin, geometry, instrument)"
      }
    ],
    "action_required": "Set confirm_duplicate=true in your request payload to bypass this warning and create the wish anyway."
  }
}
```

### Bypass Request (HTTP 201 Created)
```json
{
  "title": "Geometry Boxes for High School",
  "description": "Additional sets specifically for Grade 10 board exam students.",
  "item_name": "Geometry Instrument Box Camlin",
  "qty_requested": 20,
  "needed_by": "2026-11-20T10:00:00Z",
  "category_id": 1,
  "confirm_duplicate": true
}
```
Result: Returns `HTTP 201 Created` with the new wish record.

