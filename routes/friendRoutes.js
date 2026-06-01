const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

const router = express.Router();

router.get("/search", protect, async (req, res) => {
  try {
    const q = req.query.q || "";

    if (!q.trim()) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ]
    })
      .select("username email avatar")
      .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Kullanıcı arama hatası." });
  }
});

router.post("/request", protect, async (req, res) => {
  try {
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ message: "Kullanıcı seçilmedi." });
    }

    if (String(toUserId) === String(req.user._id)) {
      return res.status(400).json({ message: "Kendine istek gönderemezsin." });
    }

    const targetUser = await User.findById(toUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const existing = await FriendRequest.findOne({
      from: req.user._id,
      to: toUserId
    });

    if (existing) {
      return res.status(400).json({ message: "Zaten istek gönderilmiş." });
    }

    const request = await FriendRequest.create({
      from: req.user._id,
      to: toUserId
    });

    res.status(201).json({ request, message: "Arkadaş isteği gönderildi." });
  } catch (error) {
    res.status(500).json({ message: "Arkadaş isteği gönderilemedi." });
  }
});

router.get("/requests", protect, async (req, res) => {
  try {
    const incoming = await FriendRequest.find({
      to: req.user._id,
      status: "pending"
    }).populate("from", "username email avatar");

    const outgoing = await FriendRequest.find({
      from: req.user._id,
      status: "pending"
    }).populate("to", "username email avatar");

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ message: "İstekler alınamadı." });
  }
});

router.post("/accept/:requestId", protect, async (req, res) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.requestId,
      to: req.user._id,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({ message: "İstek bulunamadı." });
    }

    request.status = "accepted";
    await request.save();

    res.json({ message: "Arkadaş isteği kabul edildi." });
  } catch (error) {
    res.status(500).json({ message: "İstek kabul edilemedi." });
  }
});

router.get("/list", protect, async (req, res) => {
  try {
    const accepted = await FriendRequest.find({
      status: "accepted",
      $or: [{ from: req.user._id }, { to: req.user._id }]
    })
      .populate("from", "username email avatar")
      .populate("to", "username email avatar");

    const friends = accepted.map((request) => {
      const isFromMe = String(request.from._id) === String(req.user._id);
      return isFromMe ? request.to : request.from;
    });

    res.json({ friends });
  } catch (error) {
    res.status(500).json({ message: "Arkadaş listesi alınamadı." });
  }
});

module.exports = router;
