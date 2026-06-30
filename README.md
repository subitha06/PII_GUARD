# PII Guard

## Overview

PII Guard is a cybersecurity-based web application designed to identify, encrypt, and protect Personally Identifiable Information (PII) from unauthorized access. The system helps users securely store sensitive information by applying encryption techniques and user authentication.

## Features

* User Registration and Login
* JWT-based Authentication
* Password Hashing using Bcrypt
* PII Detection
* Data Encryption
* Data Decryption
* Secure Storage using SQLite
* Protected API Endpoints
* User-specific Data Access

## Technologies Used

### Frontend

* React.js
* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* SQLite

### Security

* JWT (JSON Web Token)
* Bcrypt
* Encryption Algorithms

## Project Structure

PII_GUARD

frontend/

* src/
* public/

backend/

* routes/
* middleware/
* db.js
* server.js
* app.db

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd PII_GUARD
```

### Backend Setup

```bash
cd backend
npm install
node server.js
```

Backend runs on:

```bash
http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

```bash
http://localhost:3000
```

## Workflow

### Registration

1. User creates an account.
2. Password is hashed using Bcrypt.
3. User details are stored securely in SQLite.

### Login

1. User enters credentials.
2. Credentials are verified.
3. JWT token is generated.

### Encryption

1. User enters sensitive information.
2. Data is encrypted before storage.
3. Encrypted data is saved in the database.

### Decryption

1. User retrieves encrypted data.
2. System decrypts the data using the appropriate key.
3. Original information is displayed securely.

## Security Features

* Password Hashing
* Token-based Authentication
* Secure API Access
* Data Encryption
* Protected Routes
* User-specific Data Isolation

## Future Enhancements

* Multi-factor Authentication (MFA)
* Role-Based Access Control (RBAC)
* Audit Logs
* Cloud Database Integration
* Threat Detection Alerts
* Advanced PII Classification

Here's the full startup checklist for your project — you need multiple terminal windows open at once since you have two backends + a frontend.

**Window 1 — Python/FastAPI backend** (file upload encrypt/decrypt, port 8000)
```powershell
cd C:\Users\lapto\OneDrive\Desktop\pii_guard\backend
python app.py
```
Confirm you see: `Uvicorn running on http://0.0.0.0:8000`

**Window 2 — Node/Express backend** (text-paste encrypt/decrypt, port 5000 — used by `EncryptBox.jsx`/`DecryptBox.jsx`)
```powershell
cd C:\Users\lapto\OneDrive\Desktop\pii_guard\backend
node server.js
```
Confirm you see something like: `Server running on port 5000`

**Window 3 — React frontend** (port 3000)
```powershell
cd C:\Users\lapto\OneDrive\Desktop\pii_guard\frontend
npm start
```
This should auto-open `http://localhost:3000` in your browser.

A few notes:
- Keep all three windows open and running simultaneously while you test — closing any one of them breaks that part of the app.
- If `npm start` fails with missing packages, run `npm install` first in that folder.
- If `node server.js` fails, you may also need `npm install` in the backend folder (check `package.json` for what it needs — looks like it uses `db.js` too, so confirm your database, if any, is reachable).
- Your browser address bar should always be `localhost:3000` while you're using the app — never navigate directly to `127.0.0.1:8000` or `:5000` URLs yourself, those are just APIs, not pages to browse.

If any of these three fail to start, paste me the exact error from that window and I'll help fix it.
