from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from cryptography.fernet import Fernet, InvalidToken
from datetime import datetime, timedelta
from typing import Optional
import shutil, uuid, os, re, pandas as pd

from backend.csv_processor import encrypt_csv, encrypt_txt, decrypt_csv, decrypt_txt
from utils import count_pii_in_file

app = FastAPI(title="AKATSUKI — PII Shield", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DIRECTORIES ───────────────────────────────────────────────────────────────
UPLOAD_DIR = "temp/uploads"
OUTPUT_DIR = "temp/outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── KEY STORE — tracks active keys + expiry ───────────────────────────────────
# { key_id: { "key": bytes, "expires_at": datetime } }
key_store: dict = {}

KEY_EXPIRY_MINUTES = 30


def save_key(fernet_key: bytes) -> str:
    """Store key with 30 min expiry. Returns key_id."""
    key_id = str(uuid.uuid4())[:12]
    key_store[key_id] = {
        "key": fernet_key,
        "expires_at": datetime.now() + timedelta(minutes=KEY_EXPIRY_MINUTES),
    }
    return key_id


def get_key(raw_key: str) -> Fernet:
    """
    Validate and return Fernet object.
    Accepts either the raw Fernet key directly.
    Raises HTTPException if invalid or expired.
    """
    raw_key = raw_key.strip()

    # Check if it's a key_id we stored
    if raw_key in key_store:
        entry = key_store[raw_key]
        if datetime.now() > entry["expires_at"]:
            del key_store[raw_key]
            raise HTTPException(status_code=410, detail="Key has expired. Ask sender to re-encrypt.")
        return Fernet(entry["key"])

    # Otherwise treat as raw Fernet key
    try:
        return Fernet(raw_key.encode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid key. Check and try again.")


def cleanup_expired_keys():
    """Remove expired keys from store."""
    now = datetime.now()
    expired = [k for k, v in key_store.items() if now > v["expires_at"]]
    for k in expired:
        del key_store[k]


# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "AKATSUKI PII Shield is running", "version": "2.0.0"}


# ── ANALYZE ───────────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Scan file and return row count + PII summary."""
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV and TXT files are supported")

    file_id = str(uuid.uuid4())
    input_path = f"{UPLOAD_DIR}/{file_id}_{file.filename}"

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(input_path)
            row_count = len(df)
        else:
            with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
                row_count = len(f.readlines())

        pii_summary = count_pii_in_file(input_path)

        return {
            "rowCount":   row_count,
            "fileId":     file_id,
            "tempPath":   input_path,
            "piiSummary": pii_summary,
            "totalPii":   sum(pii_summary.values()),
        }
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ── ENCRYPT ───────────────────────────────────────────────────────────────────
@app.post("/encrypt")
async def encrypt(file: UploadFile = File(...)):
    """
    Encrypt all PII in uploaded file.
    Returns encrypted file name + secret key (valid 30 min).
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV and TXT files are supported")

    file_id   = str(uuid.uuid4())
    input_path  = f"{UPLOAD_DIR}/{file_id}_{file.filename}"
    output_name = f"encrypted_{file_id}_{file.filename}"
    output_path = f"{OUTPUT_DIR}/{output_name}"

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        # Generate fresh Fernet key
        fernet_key = Fernet.generate_key()
        fernet     = Fernet(fernet_key)

        # Encrypt
        if file.filename.endswith(".csv"):
            fields_encrypted = encrypt_csv(input_path, output_path, fernet)
        else:
            fields_encrypted = encrypt_txt(input_path, output_path, fernet)

        # Store key with expiry
        key_id = save_key(fernet_key)
        cleanup_expired_keys()

        return {
            "success":         True,
            "encryptedFile":   output_name,
            "key":             fernet_key.decode(),   # show to sender once
            "keyExpiresIn":    f"{KEY_EXPIRY_MINUTES} minutes",
            "fieldsEncrypted": fields_encrypted,
            "fileName":        file.filename,
        }

    except Exception as e:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")

    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


# ── DECRYPT ───────────────────────────────────────────────────────────────────
@app.post("/decrypt")
async def decrypt(
    file: UploadFile = File(...),
    key:  str        = Form(...),
):
    """
    Receiver uploads encrypted file + pastes secret key.
    Returns original decrypted file.
    Key must not be expired (30 min window).
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV and TXT files are supported")

    # Validate key (raises if expired or invalid)
    fernet = get_key(key)

    file_id     = str(uuid.uuid4())
    input_path  = f"{UPLOAD_DIR}/{file_id}_{file.filename}"
    output_name = f"decrypted_{file_id}_{file.filename}"
    output_path = f"{OUTPUT_DIR}/{output_name}"

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        if file.filename.endswith(".csv"):
            fields_decrypted = decrypt_csv(input_path, output_path, fernet)
        else:
            fields_decrypted = decrypt_txt(input_path, output_path, fernet)

        return {
            "success":         True,
            "decryptedFile":   output_name,
            "fieldsDecrypted": fields_decrypted,
            "fileName":        file.filename,
        }

    except Exception as e:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}")

    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


# ── DOWNLOAD ──────────────────────────────────────────────────────────────────
@app.get("/download/{filename}")
async def download(filename: str):
    """Download encrypted or decrypted file."""
    file_path = f"{OUTPUT_DIR}/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or already deleted")
    return FileResponse(path=file_path, filename=filename, media_type="text/csv")


# ── CLEANUP ───────────────────────────────────────────────────────────────────
@app.delete("/cleanup/{filename}")
async def cleanup(filename: str):
    """Delete file after download."""
    file_path = f"{OUTPUT_DIR}/{filename}"
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"success": True, "message": "File deleted"}
    return {"success": False, "message": "File not found"}


# ── RUN ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)