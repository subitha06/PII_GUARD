const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const encryptRoutes = require("./routes/encryptRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/data", encryptRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});