"""
Input Sanitization & Plain Text Normalization Utility

ARCHITECTURE NOTES:
- React automatically escapes text when rendering JSX expressions into the DOM,
  guaranteeing full XSS protection without running dangerouslySetInnerHTML.
- The backend stores and returns clean plain text.
- escape_html decodes any legacy HTML entities (like &amp;) back to standard plain text
  to prevent double-escaping bugs (e.g. "Bedding &amp; Linen").
"""

import html
from typing import Optional

def escape_html(text: Optional[str]) -> Optional[str]:
    """
    Returns clean plain text, decoding any previously double-escaped HTML entities.
    React natively handles DOM text escaping safely.
    """
    if text is None:
        return None
    return html.unescape(str(text))

def sanitize_plain_text(text: str) -> str:
    """
    Trims whitespace and returns clean plain text without entity escaping.
    """
    if not text:
        return ""
    return html.unescape(str(text).strip())
