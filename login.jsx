import { useState } from "react";
import axios from "axios";
import "./login.css";

function Login() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "register") {
        await axios.post("http://localhost:5000/auth/register", {
          username,
          password,
        });
        setSuccess("Account created! You can now sign in.");
        setMode("login");
      } else {
        const res = await axios.post("http://localhost:5000/auth/login", {
          username,
          password,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("tokenExpiry", Date.now() + 20 * 60 * 1000);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">⛧</div>
        <h1 className="login-title">PII_GUARD</h1>
        <p className="login-sub">SENSITIVE FILE PROTECTION SYSTEM</p>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === "login" ? "tab-active" : ""}
            onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "register" ? "tab-active" : ""}
            onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "register"
              ? "🆕 Create Account"
              : "🔐 Sign In"}
          </button>
        </form>

        <div className="login-footer">
          Session expires after 20 minutes of token validity
        </div>
      </div>
    </div>
  );
}

export default Login;