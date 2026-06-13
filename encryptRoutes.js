const express = require("express");
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Store encrypted data
router.post("/store", verifyToken, (req, res) => {
  const { encryptedText } = req.body;
  const userId = req.user.id;

  db.run(
    "INSERT INTO data (userId, encryptedText) VALUES (?, ?)",
    [userId, encryptedText],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({ message: "Encrypted data stored" });
    }
  );
});

module.exports = router;