"""
Input Sanitization & Output Escaping Utility
Prevents Cross-Site Scripting (XSS) and injection attacks by escaping HTML entities.

ARCHITECTURE NOTES:
- Input is validated with Pydantic limits.
- Output text is escaped via html.escape so user-supplied strings cannot be executed as HTML/JavaScript in client browsers.
"""

import html
from typing import Optional

def escape_html(text: Optional[str]) -> Optional[str]:
    """
    Escapes HTML special characters (&, <, >, ", ') into safe HTML entities.
    Returns None if text is None.
    """
    if text is None:
        return None
    return html.escape(str(text), quote=True)

def sanitize_plain_text(text: str) -> str:
    """
    Trims and escapes plain text input.
    """
    if not text:
        return ""
    return html.escape(text.strip(), quote=True)

