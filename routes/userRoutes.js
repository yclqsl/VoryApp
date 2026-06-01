const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  res.json({
    user: req.user
  });
});

module.exports = router;