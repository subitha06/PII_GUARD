import re

# ── PII PATTERNS ──────────────────────────────────────────────────────────────
PII_PATTERNS = {
    "aadhaar":     r"\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b",
    "pan":         r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    "email":       r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "phone":       r"\b[6-9][0-9]{9}\b",
    "credit_card": r"\b(?:\d{4}[\s-]?){3}\d{4}\b",
    "ip_address":  r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",
}


# ── COUNT PII IN FILE ─────────────────────────────────────────────────────────
def count_pii_in_file(file_path: str) -> dict:
    """Scan file and return count of each PII type found."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    summary = {}
    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, content)
        if matches:
            summary[pii_type] = len(matches)

    return summary