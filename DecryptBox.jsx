import { useState, useEffect } from "react";
import axios from "axios";
import { decryptData } from "../utils/crypto";

function DecryptBox() {
  const [cipherText, setCipherText] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);

  const token = localStorage.getItem("token");

  // ── Check lockout status on mount ──
  useEffect(() => {
    checkLockout();
  }, []);

  const checkLockout = async () => {
    try {
      const res = await axios.get("http://localhost:5000/data/check-lockout", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.locked) {
        setLocked(true);
        setStatus(`🔒 ${res.data.message}`);
      } else {
        setLocked(false);
      }
    } catch (err) {
      // ignore — lockout check failing shouldn't block usage entirely
    }
  };

  const handleDecrypt = async () => {
    if (locked) {
      setStatus("🔒 Account locked due to too many wrong attempts. Please wait.");
      return;
    }

    if (!password) {
      setStatus("❌ Enter the decryption password");
      return;
    }

    if (!cipherText.trim()) {
      setStatus("❌ Paste encrypted text first");
      return;
    }

    let decrypted = null;
    try {
      decrypted = decryptData(cipherText, password);
    } catch {
      decrypted = null;
    }

    if (!decrypted) {
      // ── WRONG PASSWORD — record failed attempt on server ──
      try {
        const res = await axios.post(
          "http://localhost:5000/data/record-failed",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.locked) {
          setLocked(true);
          setStatus(`🔒 ${res.data.message}`);
        } else {
          setStatus(`❌ Wrong password or corrupted data. ${res.data.attemptsLeft} attempt(s) remaining.`);
        }
      } catch {
        setStatus("❌ Wrong password or corrupted data");
      }
      setOutput("");
      return;
    }

    // ── SUCCESS — reset attempts on server ──
    try {
      await axios.post(
        "http://localhost:5000/data/reset",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // non-critical if this fails
    }

    setOutput(decrypted);
    setStatus("✅ Decrypted successfully");
  };

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <span style={styles.icon}>🔓</span>
        <h2 style={styles.title}>DECRYPT FILE</h2>
      </div>

      <label style={styles.label}>Decryption Password</label>
      <input
        type="password"
        placeholder="Enter the same password used to encrypt"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
        disabled={locked}
      />

      <label style={styles.label}>Encrypted Text</label>
      <textarea
        placeholder="Paste encrypted text here..."
        value={cipherText}
        onChange={(e) => setCipherText(e.target.value)}
        style={styles.textarea}
        disabled={locked}
      />

      {status && (
        <div style={{
          ...styles.status,
          color: status.startsWith("✅") ? "#22c55e" : "#ef4444"
        }}>
          {status}
        </div>
      )}

      <button onClick={handleDecrypt} style={styles.btn} disabled={locked}>
        {locked ? "🔒 Locked" : "🔓 Decrypt"}
      </button>

      {output && (
        <div style={styles.outputBox}>
          <label style={styles.label}>Decrypted Result</label>
          <p style={styles.outputText}>{output}</p>
        </div>
      )}
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
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  icon: { fontSize: "20px" },
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
  },
  status: {
    fontSize: "13px",
    padding: "8px 12px",
    background: "#111",
    borderRadius: "6px",
  },
  btn: {
    background: "#1a1a1a",
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    letterSpacing: "1px",
    marginTop: "4px",
  },
  outputBox: {
    background: "#111",
    border: "1px solid #2d2d2d",
    borderRadius: "8px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  outputText: {
    color: "#22c55e",
    fontFamily: "monospace",
    fontSize: "14px",
    margin: 0,
    wordBreak: "break-all",
  },
};

export default DecryptBox;