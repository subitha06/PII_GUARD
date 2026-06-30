import { useState } from "react";
import axios from "axios";
import { encryptData } from "../utils/crypto";
import { containsPII } from "../utils/piiDetection";

// ── PASSWORD STRENGTH CHECKER ──────────────────────────────────────────────
const getPasswordStrength = (pwd) => {
  if (!pwd) return { label: "", score: 0, color: "" };

  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { label: "Weak", score, color: "#ef4444" };
  if (score <= 4) return { label: "Medium", score, color: "#f59e0b" };
  return { label: "Strong", score, color: "#22c55e" };
};

function EncryptBox() {
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleEncrypt = async () => {
    if (!password) {
      setStatus("error:Enter your encryption password");
      return;
    }

    if (!text.trim()) {
      setStatus("error:Enter text to encrypt");
      return;
    }

    if (!containsPII(text)) {
      setStatus("warn:No PII detected - encryption skipped");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const encrypted = encryptData(text, password);
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/data/store",
        { encryptedText: encrypted },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatus("ok:Encrypted and stored successfully");
      setText("");
      setPassword("");
    } catch (err) {
      setStatus("error:Failed to store - check if backend is running on port 5000");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.startsWith("ok:")) return "#22c55e";
    if (status.startsWith("warn:")) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusText = () => status.split(":").slice(1).join(":");

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <h2 style={styles.title}>ENCRYPT FILE</h2>
      </div>

      <label style={styles.label}>Encryption Password</label>
      <input
        type="password"
        placeholder="Enter password to encrypt with"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      {/* ── PASSWORD STRENGTH METER ── */}
      {password && (
        <div style={{ marginTop: "-4px" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
            {[1, 2, 3, 4, 5, 6].map((bar) => (
              <div
                key={bar}
                style={{
                  height: "5px",
                  flex: 1,
                  borderRadius: "3px",
                  background: bar <= strength.score ? strength.color : "#2d2d2d",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: strength.color, letterSpacing: "1px" }}>
            {strength.label} PASSWORD
          </div>
        </div>
      )}

      <label style={styles.label}>Sensitive Text</label>
      <textarea
        placeholder="Paste text containing PII (email, phone, Aadhaar)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={styles.textarea}
      />

      {status && (
        <div style={{ ...styles.status, color: getStatusColor() }}>
          {getStatusText()}
        </div>
      )}

      <button onClick={handleEncrypt} disabled={loading} style={styles.btn}>
        {loading ? "Encrypting..." : "Encrypt & Store"}
      </button>
    </div>
  );
}

const styles = {
  box: {
    background: "#0d0d0d",
    border: "1px solid #1f1f1f",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    marginBottom: "8px",
  },
  title: {
    color: "#ef4444",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "2px",
    margin: 0,
  },
  label: {
    color: "#9ca3af",
    fontSize: "12px",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  input: {
    background: "#1a1a1a",
    border: "1px solid #2d2d2d",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    background: "#1a1a1a",
    border: "1px solid #2d2d2d",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    minHeight: "120px",
    resize: "vertical",
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box",
  },
  status: {
    fontSize: "13px",
    padding: "8px 12px",
    background: "#111",
    borderRadius: "6px",
  },
  btn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    letterSpacing: "1px",
    marginTop: "4px",
    width: "100%",
  },
};

export default EncryptBox;