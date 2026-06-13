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
          <div className="brand-name">SHIELDNET</div>
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
        SHIELDNET · Encrypt → Send → Decrypt · Key expires in 30 min
      </footer>
    </div>
  );
}

function EncryptPanel() {
  const [file, setFile] = useState(null);
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
    setStep(3);
    setLogs([]);
    setProgress(0);

    const steps = [
      [15, "Reading file..."],
      [35, "Scanning PII patterns..."],
      [60, "Encrypting fields with Fernet AES..."],
      [80, "Generating 30-min key..."],
      [95, "Writing output..."],
    ];

    for (const [pct, msg] of steps) {
      setProgress(pct);
      addLog("→ " + msg);
      await sleep(380 + Math.random() * 250);
    }

    const fd = new FormData();
    fd.append("file", file);

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

  const copyKey = () => {
    navigator.clipboard.writeText(result.key);
    alert("Key copied! Send it via SMS or a different app — NOT the same channel as the file.");
  };

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
          <div className="card-label red">02 // File Ready</div>
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
          <div className="notice">
            🔐 All PII fields (Aadhaar, PAN, Email, Phone, Credit Card) will be encrypted.<br />
            A secret key will be generated — valid for <strong>30 minutes.</strong>
          </div>
          <div className="btn-row">
            <button className="btn btn-red" onClick={handleEncrypt}>⚙ Encrypt Now</button>
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
                {result.fieldsEncrypted} PII field(s) locked. Key expires in <strong>30 minutes.</strong>
              </div>

              <div className="key-label">🔑 SECRET KEY — Copy &amp; send via SMS or different app</div>
              <div className="key-box">{result.key}</div>
              <button className="copy-btn" onClick={copyKey}>📋 Copy Key</button>

              <div className="warning-box">
                ⚠ Send the <strong>FILE</strong> via WhatsApp/Email.<br />
                Send the <strong>KEY</strong> via SMS or a completely different app.<br />
                <strong>NEVER send both through the same channel.</strong>
              </div>

              <div className="btn-row">
                <button className="btn btn-red" onClick={handleDownload}>⬇ Download Encrypted File</button>
                <button className="btn btn-ghost" onClick={reset}>Encrypt Another</button>
              </div>
              <div className="auto-del">⏱ File deleted from server in 5 minutes. Key expires in 30 min.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DecryptPanel() {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState("");
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
    setFile(null); setKey(""); setStep(1);
    setProgress(0); setLogs([]); setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleDecrypt = async () => {
    if (!file || !key.trim()) return;
    setStep(2);
    setLogs([]);
    setProgress(0);

    const steps = [
      [20, "Reading encrypted file..."],
      [45, "Validating key..."],
      [70, "Decrypting Fernet tokens..."],
      [90, "Rebuilding original file..."],
    ];

    for (const [pct, msg] of steps) {
      setProgress(pct);
      addLog("→ " + msg);
      await sleep(400 + Math.random() * 300);
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("key", key.trim());

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

  const ready = file && key.trim().length > 10;

  return (
    <div>
      <Steps current={step} steps={["UPLOAD + KEY", "DECRYPT", "DOWNLOAD"]} color="green" />

      {step === 1 && (
        <div className="card card-green">
          <div className="card-label green">01 // Upload Encrypted File + Key</div>

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
            <div className="key-input-label">🔑 PASTE SECRET KEY (received via SMS / separate channel)</div>
            <textarea
              className="key-input"
              rows={3}
              placeholder="Paste key here... e.g. gAAAAABk3mX9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
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