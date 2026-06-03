const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

const router = express.Router();

const XP_REWARDS = {
  roomsJoined: 10,
  watchSeconds: 0.025,
  mediaPlayed: 7,
  messagesSent: 2,
  reactionsUsed: 1,
  invitesSent: 5,
  friends: 20,
};

function calculateProfileXp(stats = {}) {
  return Math.max(
    0,
    Math.floor(
      Number(stats.roomsJoined || 0) * XP_REWARDS.roomsJoined +
        Number(stats.watchSeconds || 0) * XP_REWARDS.watchSeconds +
        Number(stats.mediaPlayed || 0) * XP_REWARDS.mediaPlayed +
        Number(stats.messagesSent || 0) * XP_REWARDS.messagesSent +
        Number(stats.reactionsUsed || 0) * XP_REWARDS.reactionsUsed +
        Number(stats.invitesSent || 0) * XP_REWARDS.invitesSent +
        Number(stats.friends || 0) * XP_REWARDS.friends
    )
  );
}

function calculateProfileLevel(xp = 0) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1);
}

function getXpForLevel(level = 1) {
  const cleanLevel = Math.max(1, Number(level) || 1);
  return Math.pow(cleanLevel - 1, 2) * 100;
}

function buildProfileBadges(user, stats = {}) {
  const badges = new Set(user.profileBadges?.length ? user.profileBadges : ["Closed Beta Tester"]);
  const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  const betaCutoff = new Date("2026-12-31T23:59:59.999Z").getTime();

  badges.add("Vory Explorer");
  if (createdAt <= betaCutoff) badges.add("Early User");
  if (["admin", "yücel", "yucel"].includes(String(user.username || "").toLowerCase())) badges.add("Founder");
  if (Number(stats.mediaPlayed || 0) >= 25) badges.add("Movie Addict");
  if (Number(stats.watchSeconds || 0) >= 36000) badges.add("Marathon Watcher");
  if (Number(stats.roomsJoined || 0) >= 50) badges.add("Top Host");
  if (Number(stats.reactionsUsed || 0) >= 100) badges.add("Hype Machine");
  if (Number(stats.messagesSent || 0) >= 250) badges.add("Chat Legend");
  if (Number(stats.friends || 0) >= 25) badges.add("Social Butterfly");

  return Array.from(badges).slice(0, 12);
}

function pickProfileFrame(badges = [], level = 1) {
  if (badges.includes("Founder")) return "founder";
  if (level >= 20) return "galaxy";
  if (level >= 10) return "cinema";
  if (level >= 5) return "neon";
  return "rookie";
}

function safeStats(input = {}) {
  return {
    roomsJoined: Math.max(0, Number(input.roomsJoined || 0)),
    watchSeconds: Math.max(0, Number(input.watchSeconds || 0)),
    mediaPlayed: Math.max(0, Number(input.mediaPlayed || 0)),
    messagesSent: Math.max(0, Number(input.messagesSent || 0)),
    reactionsUsed: Math.max(0, Number(input.reactionsUsed || 0)),
    invitesSent: Math.max(0, Number(input.invitesSent || 0)),
    friends: Math.max(0, Number(input.friends || 0)),
  };
}

function serializeProfile(user) {
  const stats = safeStats(user.profileStats || {});
  const xp = Number(user.profileXp || calculateProfileXp(stats));
  const level = Number(user.profileLevel || calculateProfileLevel(xp));
  const nextLevelXp = getXpForLevel(level + 1);
  const currentLevelXp = getXpForLevel(level);
  const progress = nextLevelXp > currentLevelXp
    ? Math.min(100, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
    : 100;

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    statusMessage: user.statusMessage,
    favoritePlatforms: user.favoritePlatforms || [],
    profileBadges: user.profileBadges || [],
    profileFrame: user.profileFrame || "rookie",
    profileStats: stats,
    profileXp: xp,
    profileLevel: level,
    nextLevelXp,
    currentLevelXp,
    progress,
  };
}

router.get("/me", protect, async (req, res) => {
  res.json({
    user: req.user,
  });
});

router.get("/profile-summary", protect, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json({ user: serializeProfile(user) });
});

router.patch("/profile/progress", protect, async (req, res) => {
  try {
    const incomingStats = safeStats(req.body?.stats || {});
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const currentStats = safeStats(user.profileStats || {});
    const mergedStats = {
      roomsJoined: Math.max(currentStats.roomsJoined, incomingStats.roomsJoined),
      watchSeconds: Math.max(currentStats.watchSeconds, incomingStats.watchSeconds),
      mediaPlayed: Math.max(currentStats.mediaPlayed, incomingStats.mediaPlayed),
      messagesSent: Math.max(currentStats.messagesSent, incomingStats.messagesSent),
      reactionsUsed: Math.max(currentStats.reactionsUsed, incomingStats.reactionsUsed),
      invitesSent: Math.max(currentStats.invitesSent, incomingStats.invitesSent),
      friends: Math.max(currentStats.friends, incomingStats.friends),
    };

    const xp = calculateProfileXp(mergedStats);
    const level = calculateProfileLevel(xp);
    const badges = buildProfileBadges(user, mergedStats);

    user.profileStats = mergedStats;
    user.profileXp = xp;
    user.profileLevel = level;
    user.profileBadges = badges;
    user.profileFrame = pickProfileFrame(badges, level);
    user.lastProfileSyncAt = new Date();

    await user.save();

    res.json({
      message: "Profil ilerlemesi güncellendi.",
      user: serializeProfile(user),
    });
  } catch (error) {
    console.error("Profile progress update error:", error);
    res.status(500).json({ message: "Profil ilerlemesi güncellenemedi." });
  }
});

router.get("/leaderboard", protect, async (req, res) => {
  try {
    const users = await User.find()
      .select("username avatar profileXp profileLevel profileBadges profileFrame profileStats")
      .sort({ profileXp: -1, profileLevel: -1, updatedAt: -1 })
      .limit(20)
      .lean();

    res.json({
      users: users.map((user, index) => ({
        rank: index + 1,
        _id: user._id,
        username: user.username,
        avatar: user.avatar || "",
        profileXp: Number(user.profileXp || calculateProfileXp(user.profileStats || {})),
        profileLevel: Number(user.profileLevel || calculateProfileLevel(user.profileXp || 0)),
        profileBadges: user.profileBadges || [],
        profileFrame: user.profileFrame || "rookie",
        profileStats: safeStats(user.profileStats || {}),
      })),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Leaderboard alınamadı." });
  }
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
