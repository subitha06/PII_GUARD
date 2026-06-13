const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

const SECRET = "my_secret_key";

// REGISTER
router.post("/register", (req, res) => {
  console.log("Register Request:", req.body);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required"
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    function (err) {
      if (err) {
        console.log("REGISTER ERROR:", err);

        return res.status(400).json({
          error: err.message
        });
      }

      console.log("User Registered:", username);

      res.status(201).json({
        message: "User created successfully",
        userId: this.lastID
      });
    }
  );
});

// LOGIN
router.post("/login", (req, res) => {
  console.log("Login Request:", req.body);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required"
    });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, user) => {
      if (err) {
        console.log("LOGIN ERROR:", err);

        return res.status(500).json({
          error: err.message
        });
      }

      if (!user) {
        return res.status(401).json({
          message: "Invalid user"
        });
      }

      const isValid = bcrypt.compareSync(password, user.password);

      if (!isValid) {
        return res.status(401).json({
          message: "Wrong password"
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username
        },
        SECRET,
        {
          expiresIn: "20m"
        }
      );

      res.json({
        message: "Login successful",
        token
      });
    }
  );
});

module.exports = router;