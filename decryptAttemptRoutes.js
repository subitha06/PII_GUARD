const express = require("express");
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

// ── CHECK LOCKOUT — call before attempting decrypt ──────────────────────────
router.get("/check-lockout", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.get("SELECT failedAttempts, lockedUntil FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "User not found" });

    if (row.lockedUntil) {
      const lockedUntil = new Date(row.lockedUntil);
      if (new Date() < lockedUntil) {
        const remainingMs = lockedUntil - new Date();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(429).json({
          locked: true,
          message: `Too many wrong attempts. Try again in ${remainingMin} minute(s).`,
        });
      }
      // lockout expired — reset
      db.run("UPDATE users SET failedAttempts = 0, lockedUntil = NULL WHERE id = ?", [userId]);
    }

    res.json({ locked: false, attemptsLeft: MAX_ATTEMPTS - (row.failedAttempts || 0) });
  });
});

// ── RECORD FAILED ATTEMPT — call when decryptData returns wrong/null ────────
router.post("/record-failed", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.get("SELECT failedAttempts FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });

    const newCount = (row.failedAttempts || 0) + 1;

    if (newCount >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
      db.run(
        "UPDATE users SET failedAttempts = ?, lockedUntil = ? WHERE id = ?",
        [newCount, lockedUntil, userId],
        (err2) => {
          if (err2) return res.status(500).json({ error: "DB error" });
          res.json({ locked: true, message: `Too many wrong attempts. Locked for ${LOCKOUT_MINUTES} minutes.` });
        }
      );
    } else {
      db.run(
        "UPDATE users SET failedAttempts = ? WHERE id = ?",
        [newCount, userId],
        (err2) => {
          if (err2) return res.status(500).json({ error: "DB error" });
          res.json({ locked: false, attemptsLeft: MAX_ATTEMPTS - newCount });
        }
      );
    }
  });
});

// ── RESET ATTEMPTS — call when decryptData succeeds ──────────────────────────
router.post("/reset", verifyToken, (req, res) => {
  const userId = req.user.id;
  db.run("UPDATE users SET failedAttempts = 0, lockedUntil = NULL WHERE id = ?", [userId], (err) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ success: true });
  });
});

module.exports = router;