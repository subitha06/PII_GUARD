import re

# ── PII REGEX PATTERNS ────────────────────────────────────────────────────────
PII_PATTERNS = {
    "AADHAAR":     r"\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b",
    "PAN":         r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    "EMAIL":       r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
    "CREDIT_CARD": r"\b(?:\d[ -]?){13,16}\b",
    "PHONE":       r"\b(?:\+91[\-\s]?)?[6-9]\d{9}\b",
    "IP_ADDRESS":  r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
}

# ── DETECT PII IN A SINGLE STRING ─────────────────────────────────────────────
def detect_pii(text: str) -> dict:
    """Returns dict of {PII_TYPE: [matches]} found in text."""
    findings = {}
    for label, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, str(text))
        if matches:
            findings[label] = matches
    return findings

# ── COUNT TOTAL PII IN A FILE ─────────────────────────────────────────────────
def count_pii_in_file(file_path: str) -> dict:
    """Scan entire file and return count per PII type."""
    import pandas as pd

    total = {}
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
            for col in df.columns:
                for val in df[col].dropna().astype(str):
                    for k, v in detect_pii(val).items():
                        total[k] = total.get(k, 0) + len(v)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            for k, v in detect_pii(content).items():
                total[k] = len(v)
    except Exception:
        pass

    return total

# ── FORMAT FILE SIZE ──────────────────────────────────────────────────────────
def fmt_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    if b < 1048576:
        return f"{b/1024:.1f} KB"
    return f"{b/1048576:.2f} MB"