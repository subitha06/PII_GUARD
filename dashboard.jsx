import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import EncryptBox from "../components/EncryptBox";
import DecryptBox from "../components/DecryptBox";

function Dashboard() {
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.main}>
        <Topbar />
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.badge}>PII_GUARD</span>
            <h1 style={styles.heading}>Sensitive File Protection</h1>
            <p style={styles.sub}>Encrypt before sending. Decrypt after receiving. Password never leaves your device.</p>
          </div>
        </div>

        <div style={styles.content}>
          <EncryptBox />
          <DecryptBox />
        </div>

        <div style={styles.footer}>
          ⚠️ Keys are derived from your password using PBKDF2 — never stored or transmitted
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    fontFamily: "'Inter', 'Arial', sans-serif",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
  header: {
    padding: "28px 32px 0",
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: "20px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  badge: {
    display: "inline-block",
    background: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "3px",
    padding: "4px 10px",
    borderRadius: "4px",
    width: "fit-content",
  },
  heading: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
    letterSpacing: "0.5px",
  },
  sub: {
    color: "#6b7280",
    fontSize: "13px",
    margin: 0,
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    padding: "24px 32px",
    flex: 1,
  },
  footer: {
    textAlign: "center",
    color: "#374151",
    fontSize: "12px",
    padding: "16px",
    borderTop: "1px solid #111",
  },
};

export default Dashboard;