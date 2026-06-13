import re
import pandas as pd
from cryptography.fernet import Fernet, InvalidToken
from utils import PII_PATTERNS

# Fernet token pattern — all encrypted values start with gAAAAA
FERNET_TOKEN = r"gAAAAA[A-Za-z0-9\-_=]+"


# ── ENCRYPT SINGLE STRING ─────────────────────────────────────────────────────
def encrypt_text(text: str, fernet: Fernet) -> tuple[str, int]:
    """
    Find all PII in text and encrypt each match.
    Returns (encrypted_text, count_of_fields_encrypted)
    """
    count = 0

    def enc(m):
        nonlocal count
        count += 1
        return fernet.encrypt(m.group().encode()).decode()

    result = str(text)
    for pattern in PII_PATTERNS.values():
        result = re.sub(pattern, enc, result)

    return result, count


# ── DECRYPT SINGLE STRING ─────────────────────────────────────────────────────
def decrypt_text(text: str, fernet: Fernet) -> tuple[str, int]:
    """
    Find all Fernet tokens in text and decrypt them.
    Returns (decrypted_text, count_of_fields_decrypted)
    """
    count = 0

    def dec(m):
        nonlocal count
        try:
            decrypted = fernet.decrypt(m.group().encode()).decode()
            count += 1
            return decrypted
        except InvalidToken:
            return m.group()  # not our token — leave as is

    result = re.sub(FERNET_TOKEN, dec, str(text))
    return result, count


# ── PROCESS CSV — ENCRYPT ─────────────────────────────────────────────────────
def encrypt_csv(input_path: str, output_path: str, fernet: Fernet) -> int:
    """
    Encrypt all PII in a CSV file.
    Returns total fields encrypted.
    """
    df = pd.read_csv(input_path)
    total_encrypted = 0

    for col in df.columns:
        for i, val in enumerate(df[col].astype(str)):
            encrypted, count = encrypt_text(val, fernet)
            df.at[i, col] = encrypted
            total_encrypted += count

    df.to_csv(output_path, index=False)
    return total_encrypted


# ── PROCESS TXT — ENCRYPT ─────────────────────────────────────────────────────
def encrypt_txt(input_path: str, output_path: str, fernet: Fernet) -> int:
    """
    Encrypt all PII in a TXT file.
    Returns total fields encrypted.
    """
    with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    encrypted, count = encrypt_text(content, fernet)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(encrypted)

    return count


# ── PROCESS CSV — DECRYPT ─────────────────────────────────────────────────────
def decrypt_csv(input_path: str, output_path: str, fernet: Fernet) -> int:
    """
    Decrypt all Fernet tokens in a CSV file.
    Returns total fields decrypted.
    """
    df = pd.read_csv(input_path)
    total_decrypted = 0

    for col in df.columns:
        for i, val in enumerate(df[col].astype(str)):
            decrypted, count = decrypt_text(val, fernet)
            df.at[i, col] = decrypted
            total_decrypted += count

    df.to_csv(output_path, index=False)
    return total_decrypted


# ── PROCESS TXT — DECRYPT ─────────────────────────────────────────────────────
def decrypt_txt(input_path: str, output_path: str, fernet: Fernet) -> int:
    """
    Decrypt all Fernet tokens in a TXT file.
    Returns total fields decrypted.
    """
    with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    decrypted, count = decrypt_text(content, fernet)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(decrypted)

    return count