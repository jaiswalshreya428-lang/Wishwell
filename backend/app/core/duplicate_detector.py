r"""
Duplicate Need Detector for Wish Management.

Engineering Design Notes:
- Purpose: Prevent children's homes from unintentionally posting redundant or duplicate wishes
  for identical physical items (e.g., multiple teachers requesting "A4 Math Notebooks").
- Algorithm: Non-ML, explainable, rule-based approach:
  1. Text Normalization:
     - Convert candidate and target strings to lowercase.
     - Remove all punctuation marks using regular expression [^\w\s].
     - Strip extraneous leading/trailing and repeated whitespace.
  2. Exact Normalized Match:
     - If normalized candidate == normalized existing, similarity = 1.0 (Exact match).
  3. Token Overlap Similarity (Jaccard Index):
     - Split normalized text into word tokens: set A and set B.
     - If both token sets are non-empty:
       Intersection: I = |A ∩ B|
       Union: U = |A ∪ B|
       Jaccard Similarity Score: J = |A ∩ B| / |A ∪ B|
     - Also check token subset containment (e.g., "notebooks" inside "math notebooks"):
       If set A is a subset of set B or vice versa, containment score = |A ∩ B| / min(|A|, |B|).
       Effective score = max(Jaccard, containment * 0.75).
     - Threshold: If similarity >= 0.5, flag as duplicate warning.
- Why Not Machine Learning?
  - ML / Neural embeddings (e.g. BERT/Word2Vec) are non-deterministic black-boxes, require GPU/heavy dependencies,
    introduce cold-start latency, and cannot be easily explained or audited in university technical evaluation and regulatory settings.
  - Set-theoretic token overlap runs in O(|A| + |B|) time with zero external dependencies, is 100% deterministic,
    and directly handles token permutations (e.g. "Math Notebooks A4" and "A4 Notebooks Math" have a score of 1.0).
"""

import re
from typing import List, Tuple, Set, Optional
from dataclasses import dataclass

@dataclass
class DuplicateMatch:
    wish_id: int
    title: str
    item_name: str
    qty_requested: int
    status: str
    similarity_score: float
    match_reason: str

def normalize_text(text: str) -> str:
    """
    Normalizes text by converting to lowercase, removing punctuation,
    and stripping redundant whitespace.
    Example: "Oxford Spiral-Bound, Math Notebooks!" -> "oxford spiralbound math notebooks"
    """
    if not text:
        return ""
    # Convert to lowercase
    lowered = text.lower()
    # Strip punctuation (replace with single space to avoid merging separated words)
    no_punct = re.sub(r'[^\w\s]', ' ', lowered)
    # Collapse multiple whitespaces and trim edges
    return " ".join(no_punct.split()).strip()

def tokenize(text: str) -> Set[str]:
    """
    Tokenizes normalized text into a set of unique words.
    Example: "oxford spiral math notebooks" -> {"oxford", "spiral", "math", "notebooks"}
    """
    normalized = normalize_text(text)
    if not normalized:
        return set()
    return set(normalized.split())

def calculate_item_similarity(candidate_name: str, existing_name: str) -> Tuple[float, str]:
    """
    Calculates explainable similarity between candidate item name and existing item name.
    
    Returns:
        (score: float [0.0 to 1.0], reason: str)
    """
    norm_candidate = normalize_text(candidate_name)
    norm_existing = normalize_text(existing_name)

    if not norm_candidate or not norm_existing:
        return 0.0, "Empty string"

    # Rule 1: Exact normalized match
    if norm_candidate == norm_existing:
        return 1.0, "Exact normalized item name match"

    tokens_cand = tokenize(norm_candidate)
    tokens_exist = tokenize(norm_existing)

    if not tokens_cand or not tokens_exist:
        return 0.0, "No tokens extracted"

    intersection = tokens_cand.intersection(tokens_exist)
    union = tokens_cand.union(tokens_exist)

    if not intersection:
        return 0.0, "No common tokens found"

    # Jaccard index = |A ∩ B| / |A ∪ B|
    jaccard_score = len(intersection) / len(union)

    # Rule 2: Token subset containment (e.g. "Geometry Box" inside "Camlin Geometry Box Set")
    is_subset = tokens_cand.issubset(tokens_exist) or tokens_exist.issubset(tokens_cand)
    containment_score = 0.0
    if is_subset:
        min_len = min(len(tokens_cand), len(tokens_exist))
        if min_len > 0:
            containment_score = len(intersection) / min_len

    # Effective score gives weight to high subset overlap
    effective_score = max(jaccard_score, containment_score * 0.8)

    shared_words = ", ".join(sorted(intersection))
    if effective_score >= 0.5:
        if is_subset and containment_score >= 0.9:
            reason = f"Keyword subset match ({len(intersection)} shared words: {shared_words})"
        else:
            reason = f"Token overlap ({round(effective_score * 100)}% similarity, shared words: {shared_words})"
        return round(effective_score, 2), reason

    return round(effective_score, 2), "Below similarity threshold"

def find_duplicate_wishes(
    candidate_item_name: str,
    open_wishes: list,
    similarity_threshold: float = 0.5
) -> List[DuplicateMatch]:
    """
    Evaluates candidate item against all open wishes belonging to the same institution
    in the same category. Returns any matches meeting or exceeding the threshold.
    """
    duplicates: List[DuplicateMatch] = []

    for wish in open_wishes:
        score, reason = calculate_item_similarity(candidate_item_name, wish.item_name)
        if score >= similarity_threshold:
            duplicates.append(
                DuplicateMatch(
                    wish_id=wish.id,
                    title=wish.title,
                    item_name=wish.item_name,
                    qty_requested=wish.qty_requested,
                    status=wish.status,
                    similarity_score=score,
                    match_reason=reason
                )
            )

    # Sort duplicates by similarity score descending (highest match first)
    duplicates.sort(key=lambda d: d.similarity_score, reverse=True)
    return duplicates

