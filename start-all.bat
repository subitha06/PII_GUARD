@echo off
start "FastAPI Backend" cmd /k "cd backend && uvicorn app:app --reload"
start "Node Auth Server" cmd /k "cd backend && node server.js"
start "React Frontend" cmd /k "cd frontend && npm start"