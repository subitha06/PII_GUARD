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

## Author

Glory Manoharan

Cybersecurity Student

RMK College of Engineering and Technology
