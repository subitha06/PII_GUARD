from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from cryptography.fernet import Fernet, InvalidToken
from datetime import datetime, timedelta
from typing import Optional
import shutil, uuid, os, re, pandas as pd

from csv_processor import encrypt_csv, encrypt_txt, decrypt_csv, decrypt_txt
from utils import count_pii_in_file
from utils.crypto import derive_key, encrypt_file, decrypt_file

app = FastAPI(title="AKATSUKI — PII Shield", version="3.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DIRECTORIES ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "temp", "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "temp", "outputs")

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
except Exception as e:
    print(f"Warning: Could not create temp dirs: {e}")
# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "AKATSUKI PII Shield is running", "version": "3.0.0"}


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
async def encrypt(
    file:     UploadFile = File(...),
    password: str        = Form(...),   # ← sender enters password
):
    """
    Encrypt all PII in uploaded file using password-based AES encryption.
    Password is passed through PBKDF2 to derive AES key internally.
    Raw key is never shown or stored.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV and TXT files are supported")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    file_id     = str(uuid.uuid4())
    input_path  = f"{UPLOAD_DIR}/{file_id}_{file.filename}"
    output_name = f"encrypted_{file_id}_{file.filename}"
    output_path = f"{OUTPUT_DIR}/{output_name}"

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        # Derive AES key from password using PBKDF2 + random salt
        salt       = os.urandom(16)
        fernet_key = derive_key(password, salt)
        fernet     = Fernet(fernet_key)

        # Encrypt PII fields in file
        if file.filename.endswith(".csv"):
            fields_encrypted = encrypt_csv(input_path, output_path, fernet)
        else:
            fields_encrypted = encrypt_txt(input_path, output_path, fernet)

        # Prepend salt to encrypted output file so receiver can regenerate key
        with open(output_path, "rb") as f:
            encrypted_content = f.read()
        with open(output_path, "wb") as f:
            f.write(salt + encrypted_content)   # salt (16 bytes) + encrypted data

        return {
            "success":         True,
            "encryptedFile":   output_name,
            "message":         "Share your password with receiver via a separate channel",
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
    file:     UploadFile = File(...),
    password: str        = Form(...),   # ← receiver enters same password
):
    """
    Receiver uploads encrypted file + enters same password.
    System extracts salt from file, regenerates same AES key, decrypts.
    Raw key is never stored or shared.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV and TXT files are supported")

    file_id     = str(uuid.uuid4())
    input_path  = f"{UPLOAD_DIR}/{file_id}_{file.filename}"
    output_name = f"decrypted_{file_id}_{file.filename}"
    output_path = f"{OUTPUT_DIR}/{output_name}"

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        # Extract salt from first 16 bytes, rest is encrypted content
        with open(input_path, "rb") as f:
            raw = f.read()

        if len(raw) < 16:
            raise HTTPException(status_code=400, detail="File too small to be a valid encrypted file")

        salt              = raw[:16]
        encrypted_content = raw[16:]

        # Write back only the encrypted content (without salt) for decryption
        with open(input_path, "wb") as f:
            f.write(encrypted_content)

        # Regenerate same AES key using same password + extracted salt
        fernet_key = derive_key(password, salt)
        fernet     = Fernet(fernet_key)

        # ── EXPLICIT VERIFICATION STEP ──────────────────────────────────────
        # Before touching the whole file, find the FIRST Fernet token in the
        # raw content and try to decrypt JUST that one token directly here.
        # If the password is wrong, Fernet.decrypt raises InvalidToken
        # immediately, and we never proceed to process/write any output file.
        with open(input_path, "rb") as f:
            content_preview = f.read().decode("utf-8", errors="ignore")

        token_match = re.search(r"gAAAAA[A-Za-z0-9\-_=]+", content_preview)
        if not token_match:
            raise HTTPException(
                status_code=400,
                detail="No encrypted PII fields found in this file — it may not be a valid PII_Guard encrypted file"
            )

        # This line raises InvalidToken on wrong password — caught below
        fernet.decrypt(token_match.group().encode())
        # ──────────────────────────────────────────────────────────────────

        # Password verified correct — now safe to decrypt the whole file
        if file.filename.endswith(".csv"):
            fields_decrypted = decrypt_csv(input_path, output_path, fernet)
        else:
            fields_decrypted = decrypt_txt(input_path, output_path, fernet)

        # Extra safety net: if somehow zero fields got decrypted, treat as failure
        if fields_decrypted == 0:
            if os.path.exists(output_path):
                os.remove(output_path)
            raise HTTPException(status_code=400, detail="Wrong password or corrupted file")

        return {
            "success":         True,
            "decryptedFile":   output_name,
            "fieldsDecrypted": fields_decrypted,
            "fileName":        file.filename,
        }

    except InvalidToken:
        raise HTTPException(status_code=400, detail="Wrong password or corrupted file")

    except HTTPException:
        raise

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
