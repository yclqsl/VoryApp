const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  res.json({
    user: req.user,
  });
});

router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Avatar dosyası gerekli." });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "voryapp/avatars",
      public_id: `user_${req.user._id}_${Date.now()}`,
      overwrite: true,
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select("-password");

    res.json({
      message: "Avatar güncellendi.",
      user,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ message: "Avatar yüklenemedi." });
  }
});

module.exports = router;
