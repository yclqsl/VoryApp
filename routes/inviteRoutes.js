const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/room-link", protect, async (req, res) => {
  const { roomCode } = req.body;

  if (!roomCode) {
    return res.status(400).json({ message: "Oda kodu gerekli." });
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const inviteLink = `${frontendUrl}/?room=${roomCode}`;

  res.json({
    roomCode,
    inviteLink
  });
});

module.exports = router;
