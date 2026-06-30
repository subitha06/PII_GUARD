function Sidebar() {
  return (
    <div style={styles.sidebar}>
      <h2>SecureSys 🔐</h2>

      <ul style={styles.list}>
        <li>Dashboard</li>
        <li>Encrypt</li>
        <li>Decrypt</li>
        <li>Logs</li>
      </ul>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "220px",
    height: "100vh",
    background: "#111827",
    color: "white",
    padding: "20px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    marginTop: "20px",
    lineHeight: "2",
  },
};

export default Sidebar;