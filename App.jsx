

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useRef } from "react";
import "./App.css";
import Login from "./pages/login.jsx";

const API = "http://127.0.0.1:8000";

const fmtBytes = (b) => {
  if (!b) return "0 B";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getPasswordStrength = (pwd) => {
  if (!pwd) return { label: "", score: 0, color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: "Weak", score, color: "#e63946" };
  if (score <= 4) return { label: "Medium", score, color: "#f4a900" };
  return { label: "Strong", score, color: "#2dd36f" };
};

function isLoggedIn() {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("tokenExpiry");
  if (!token || !expiry) return false;
  return Date.now() < Number(expiry);
}

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Dashboard() {
  const [tab, setTab] = useState("encrypt");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    window.location.href = "/login";
  };

  return (
    <div className="page">
      <header className="header">
        <div className="logo">⛧</div>
        <div>
          <div className="brand-name">PII_GUARD</div>
          <div className="brand-sub">SENSITIVE FILE PROTECTION SYSTEM</div>
        </div>
        <div className="online-badge">
          <span className="dot" />
          ONLINE
        </div>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ marginLeft: "auto" }}>
          Logout
        </button>
      </header>

      <div className="tab-row">
        <button
          className={`tab-btn ${tab === "encrypt" ? "tab-active-red" : ""}`}
          onClick={() => setTab("encrypt")}
        >
          🔐 SENDER — Encrypt File
        </button>
        <button
          className={`tab-btn ${tab === "decrypt" ? "tab-active-green" : ""}`}
          onClick={() => setTab("decrypt")}
        >
          🔓 RECEIVER — Decrypt File
        </button>
      </div>

      <main className="main">
        {tab === "encrypt" ? <EncryptPanel /> : <DecryptPanel />}
      </main>

      <footer className="footer">
        PII_GUARD · Encrypt → Send → Decrypt · Protected with Password-Based AES Encryption
      </footer>
    </div>
  );
}

function EncryptPanel() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const addLog = (msg, ok = false) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs((l) => [...l, { ts, msg, ok }]);
  };

  const reset = () => {
    setFile(null); setStep(1); setAnalysis(null);
    setProgress(0); setLogs([]); setResult(null);
    setPassword(""); setShowPassword(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data);
      setStep(2);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleEncrypt = async () => {
    if (password.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }

    setStep(3);
    setLogs([]);
    setProgress(0);

    const steps = [
      [15, "Reading file..."],
      [35, "Scanning PII patterns..."],
      [55, "Deriving AES key from password (PBKDF2)..."],
      [75, "Encrypting fields with AES..."],
      [95, "Writing output..."],
    ];

    for (const [pct, msg] of steps) {
      setProgress(pct);
      addLog("→ " + msg);
      await sleep(380 + Math.random() * 250);
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("password", password);

    try {
      const res = await fetch(`${API}/encrypt`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Encryption failed");
      setProgress(100);
      addLog("✓ Done!", true);
      await sleep(400);
      setResult(data);
      setStep(4);
    } catch (e) {
      addLog("✗ " + e.message);
    }
  };

  const handleDownload = () => {
    window.open(`${API}/download/${result.encryptedFile}`, "_blank");
  };

  const strength = getPasswordStrength(password);

  return (
    <div>
      <Steps current={step} steps={["UPLOAD", "ANALYZE", "ENCRYPT", "DOWNLOAD"]} color="red" />

      {step === 1 && (
        <div className="card card-red">
          <div className="card-label red">01 // Upload File</div>
          <div
            className={`dropzone ${dragging ? "dz-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.txt" hidden
              onChange={(e) => setFile(e.target.files[0])} />
            <div className="dz-icon">📁</div>
            <div className="dz-text"><strong>Drop file here</strong> or click to browse</div>
            <div className="dz-hint">CSV · TXT supported</div>
          </div>

          {file && (
            <div className="file-badge red-badge">
              <span>📄</span>
              <span className="fname">{file.name}</span>
              <span className="fsize">{fmtBytes(file.size)}</span>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-red" disabled={!file} onClick={handleAnalyze}>
              ⚡ Analyze File
            </button>
          </div>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="card card-red">
          <div className="card-label red">02 // Set Password & Encrypt</div>
          <div className="info-box">
            <div className="info-row">
              <span className="info-label">FILE</span>
              <span className="info-val">{file.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">ROWS</span>
              <span className="info-val">{analysis.rowCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">SIZE</span>
              <span className="info-val">{fmtBytes(file.size)}</span>
            </div>
          </div>

          <div className="key-input-wrap">
            <div className="key-input-label">🔑 SET ENCRYPTION PASSWORD</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="key-input"
                placeholder="Enter a strong password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid var(--red)", background: "var(--bg2)", color: "var(--fg)" }}
              />
              <button
                className="btn btn-ghost"
                onClick={() => setShowPassword(!showPassword)}
                style={{ whiteSpace: "nowrap" }}
              >
                {showPassword ? "🙈 Hide" : "👁 Show"}
              </button>
            </div>

            {password && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                  {[1, 2, 3, 4, 5, 6].map((bar) => (
                    <div
                      key={bar}
                      style={{
                        height: "6px",
                        flex: 1,
                        borderRadius: "3px",
                        background: bar <= strength.score ? strength.color : "#3a3a3a",
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: strength.color }}>
                  {strength.label} Password
                </div>
              </div>
            )}

            <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "6px" }}>
              ⚠ Share this password with receiver via SMS or a <strong>different channel</strong> — NOT the same channel as the file.
            </div>
          </div>

          <div className="notice">
            🔐 All PII fields (Aadhaar, PAN, Email, Phone, Credit Card) will be encrypted.<br />
            Password is converted to AES key using <strong>PBKDF2</strong> — raw key is never stored or shown.
          </div>

          <div className="btn-row">
            <button
              className="btn btn-red"
              disabled={password.length < 8}
              onClick={handleEncrypt}
            >
              ⚙ Encrypt Now
            </button>
            <button className="btn btn-ghost" onClick={reset}>← Back</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card card-red">
          <div className="card-label red">03 // Encrypting</div>
          <div className="prog-wrap">
            <div className="prog-bar red-bar" style={{ width: progress + "%" }} />
          </div>
          <div className="log-box">
            {logs.map((l, i) => (
              <div key={i} className="log-line">
                <span className="log-ts red-ts">[{l.ts}]</span>
                <span style={{ color: l.ok ? "var(--green)" : "inherit" }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="card card-red">
          <div className="card-label red">04 // Done — Share Safely</div>
          <div className="result-box">
            <div className="result-icon">✅</div>
            <div className="result-info">
              <div className="result-title">FILE ENCRYPTED</div>
              <div className="result-sub">
                {result.fieldsEncrypted} PII field(s) locked using password-based AES encryption.
              </div>

              <div className="warning-box">
                🔑 <strong>Remind receiver of the password</strong> you set — via SMS or a completely different app.<br />
                Send the <strong>FILE</strong> via WhatsApp/Email.<br />
                Send the <strong>PASSWORD</strong> via SMS or a different channel.<br />
                <strong>NEVER send both through the same channel.</strong>
              </div>

              <div className="btn-row">
                <button className="btn btn-red" onClick={handleDownload}>⬇ Download Encrypted File</button>
                <button className="btn btn-ghost" onClick={reset}>Encrypt Another</button>
              </div>
              <div className="auto-del">⏱ File deleted from server in 5 minutes.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DecryptPanel() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const addLog = (msg, ok = false) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs((l) => [...l, { ts, msg, ok }]);
  };

  const reset = () => {
    setFile(null); setPassword(""); setStep(1);
    setProgress(0); setLogs([]); setResult(null);
    setShowPassword(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleDecrypt = async () => {
    if (!file || !password.trim()) return;
    setStep(2);
    setLogs([]);
    setProgress(0);

    const steps = [
      [20, "Reading encrypted file..."],
      [40, "Extracting salt from file..."],
      [60, "Regenerating AES key from password (PBKDF2)..."],
      [85, "Decrypting fields..."],
      [95, "Rebuilding original file..."],
    ];

    for (const [pct, msg] of steps) {
      setProgress(pct);
      addLog("→ " + msg);
      await sleep(400 + Math.random() * 300);
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("password", password.trim());

    try {
      const res = await fetch(`${API}/decrypt`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Decryption failed");
      setProgress(100);
      addLog("✓ Decryption successful!", true);
      await sleep(400);
      setResult(data);
      setStep(3);
    } catch (e) {
      addLog("✗ " + e.message);
      alert("❌ " + e.message);
      setStep(1);
    }
  };

  const handleDownload = () => {
    window.open(`${API}/download/${result.decryptedFile}`, "_blank");
  };

  const ready = file && password.trim().length >= 8;

  return (
    <div>
      <Steps current={step} steps={["UPLOAD + PASSWORD", "DECRYPT", "DOWNLOAD"]} color="green" />

      {step === 1 && (
        <div className="card card-green">
          <div className="card-label green">01 // Upload Encrypted File + Password</div>

          <div
            className={`dropzone dz-green ${dragging ? "dz-over-green" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.txt" hidden
              onChange={(e) => setFile(e.target.files[0])} />
            <div className="dz-icon">🔒</div>
            <div className="dz-text"><strong>Drop encrypted file here</strong> or click to browse</div>
            <div className="dz-hint">The file you received from sender</div>
          </div>

          {file && (
            <div className="file-badge green-badge">
              <span>🔒</span>
              <span className="fname">{file.name}</span>
              <span className="fsize">{fmtBytes(file.size)}</span>
            </div>
          )}

          <div className="key-input-wrap">
            <div className="key-input-label">🔑 ENTER PASSWORD (received from sender via separate channel)</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="key-input"
                placeholder="Enter the password shared by sender"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid var(--green)", background: "var(--bg2)", color: "var(--fg)" }}
              />
              <button
                className="btn btn-ghost"
                onClick={() => setShowPassword(!showPassword)}
                style={{ whiteSpace: "nowrap" }}
              >
                {showPassword ? "🙈 Hide" : "👁 Show"}
              </button>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn-green" disabled={!ready} onClick={handleDecrypt}>
              🔓 Decrypt File
            </button>
            <button className="btn btn-ghost" onClick={reset}>Clear</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card card-green">
          <div className="card-label green">02 // Decrypting</div>
          <div className="prog-wrap">
            <div className="prog-bar green-bar" style={{ width: progress + "%" }} />
          </div>
          <div className="log-box">
            {logs.map((l, i) => (
              <div key={i} className="log-line">
                <span className="log-ts green-ts">[{l.ts}]</span>
                <span style={{ color: l.ok ? "var(--green)" : "inherit" }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="card card-green">
          <div className="card-label green">03 // Decryption Complete</div>
          <div className="result-box">
            <div className="result-icon">🔓</div>
            <div className="result-info">
              <div className="result-title" style={{ color: "var(--green)" }}>FILE DECRYPTED</div>
              <div className="result-sub">
                {result.fieldsDecrypted} field(s) restored. Original data is back!
              </div>
              <div className="btn-row">
                <button className="btn btn-green" onClick={handleDownload}>
                  ⬇ Download Original File
                </button>
                <button className="btn btn-ghost" onClick={reset}>Decrypt Another</button>
              </div>
              <div className="auto-del">⏱ File deleted from server in 5 minutes.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ current, steps, color }) {
  return (
    <div className="steps">
      {steps.map((s, i) => {
        const n = i + 1;
        const cls = n < current ? "step done" : n === current ? `step active-${color}` : "step";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div className={cls}>
              <div className="step-n">{n < current ? "✓" : n}</div>
              <span>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="step-sep" />}
          </div>
        );
      })}
    </div>
  );
}
