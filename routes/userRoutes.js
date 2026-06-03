const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

const router = express.Router();

function calculateProfileXp(stats = {}) {
  return Math.max(0, Math.floor(
    Number(stats?.roomsJoined || 0) * 10 +
    Number(stats?.watchSeconds || 0) * 0.025 +
    Number(stats?.mediaPlayed || 0) * 7 +
    Number(stats?.messagesSent || 0) * 2 +
    Number(stats?.reactionsUsed || 0) +
    Number(stats?.invitesSent || 0) * 5 +
    Number(stats?.friends || 0) * 20
  ));
}

function calculateProfileLevel(xp = 0) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1);
}

function xpForLevel(level = 1) {
  return Math.pow(Math.max(1, Number(level) || 1) - 1, 2) * 100;
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getDailyMissionDefinitions() {
  return [
    {
      id: "watch-30-min",
      icon: "🎬",
      title: "30 dk izle",
      description: "Bugün toplam 30 dakika watch party yap.",
      xpReward: 50,
      target: 1800,
      statKey: "watchSeconds",
    },
    {
      id: "send-10-messages",
      icon: "💬",
      title: "10 mesaj gönder",
      description: "Bugün sohbeti canlandır.",
      xpReward: 40,
      target: 10,
      statKey: "messagesSent",
    },
    {
      id: "use-5-reactions",
      icon: "🔥",
      title: "5 reaction kullan",
      description: "Odaya hype kat.",
      xpReward: 35,
      target: 5,
      statKey: "reactionsUsed",
    },
    {
      id: "join-room",
      icon: "🚀",
      title: "1 odaya katıl",
      description: "Bir watch party odasına gir.",
      xpReward: 45,
      target: 1,
      statKey: "roomsJoined",
    },
    {
      id: "invite-friend",
      icon: "👥",
      title: "1 davet gönder",
      description: "Bir arkadaşını partiye çağır.",
      xpReward: 75,
      target: 1,
      statKey: "invitesSent",
    },
  ];
}

function buildAchievementDefinitions(stats = {}, level = 1) {
  return [
    {
      id: "first-room",
      icon: "🏠",
      title: "First Room",
      description: "İlk odana katıldın veya oda oluşturdun.",
      xpReward: 25,
      unlocked: Number(stats.roomsJoined || 0) >= 1,
    },
    {
      id: "first-watch",
      icon: "🎬",
      title: "First Watch",
      description: "İlk medyanı başlattın.",
      xpReward: 25,
      unlocked: Number(stats.mediaPlayed || 0) >= 1 || Number(stats.watchSeconds || 0) >= 60,
    },
    {
      id: "chat-starter",
      icon: "💬",
      title: "Chat Starter",
      description: "10 mesaj gönderdin.",
      xpReward: 40,
      unlocked: Number(stats.messagesSent || 0) >= 10,
    },
    {
      id: "hype-machine",
      icon: "⚡",
      title: "Hype Machine",
      description: "25 reaction kullandın.",
      xpReward: 50,
      unlocked: Number(stats.reactionsUsed || 0) >= 25,
    },
    {
      id: "voice-rookie",
      icon: "🎤",
      title: "Voice Rookie",
      description: "Voice odalarına aktif katılım.",
      xpReward: 50,
      unlocked: Number(stats.roomsJoined || 0) >= 5,
    },
    {
      id: "host-master",
      icon: "🔥",
      title: "Host Master",
      description: "50 oda aktivitesine ulaştın.",
      xpReward: 150,
      unlocked: Number(stats.roomsJoined || 0) >= 50,
    },
    {
      id: "community-legend",
      icon: "👑",
      title: "Community Legend",
      description: "Level 10 seviyesine ulaştın.",
      xpReward: 250,
      unlocked: Number(level || 1) >= 10,
    },
  ];
}

function buildProfileBadges(existingBadges = [], stats = {}, level = 1, achievements = []) {
  const badges = new Set(existingBadges?.length ? existingBadges : ["Closed Beta Tester"]);
  badges.add("Vory Explorer");

  if (level >= 5) badges.add("Rising Star");
  if (level >= 10) badges.add("Community Legend");
  if (Number(stats.mediaPlayed || 0) >= 25) badges.add("Movie Addict");
  if (Number(stats.watchSeconds || 0) >= 36000) badges.add("Marathon Watcher");
  if (Number(stats.roomsJoined || 0) >= 50) badges.add("Top Host");
  if (Number(stats.reactionsUsed || 0) >= 100) badges.add("Hype Machine");
  if (Number(stats.messagesSent || 0) >= 250) badges.add("Chat Legend");
  if (Number(stats.friends || 0) >= 25) badges.add("Social Butterfly");

  (achievements || []).forEach((achievement) => {
    if (achievement.id === "host-master") badges.add("Top Host");
    if (achievement.id === "community-legend") badges.add("Legend");
    if (achievement.id === "chat-starter") badges.add("Chat Starter");
  });

  return Array.from(badges).slice(0, 16);
}

function pickProfileFrame(level = 1, badges = []) {
  if ((badges || []).some((badge) => String(badge).toLowerCase().includes("founder"))) return "founder";
  if (level >= 15) return "galaxy";
  if (level >= 10) return "neon";
  if (level >= 7) return "cinema";
  return "rookie";
}

function normalizeStats(input = {}, previous = {}) {
  return {
    roomsJoined: Math.max(0, Number(input.roomsJoined ?? previous.roomsJoined ?? 0)),
    watchSeconds: Math.max(0, Number(input.watchSeconds ?? previous.watchSeconds ?? 0)),
    mediaPlayed: Math.max(0, Number(input.mediaPlayed ?? previous.mediaPlayed ?? 0)),
    messagesSent: Math.max(0, Number(input.messagesSent ?? previous.messagesSent ?? 0)),
    reactionsUsed: Math.max(0, Number(input.reactionsUsed ?? previous.reactionsUsed ?? 0)),
    invitesSent: Math.max(0, Number(input.invitesSent ?? previous.invitesSent ?? 0)),
    friends: Math.max(0, Number(input.friends ?? previous.friends ?? 0)),
  };
}

function buildMissionState(stats = {}, dailyMissions = {}) {
  const dateKey = getDateKey();
  const storedDateKey = dailyMissions?.dateKey || "";
  const sameDay = storedDateKey === dateKey;
  const claimedMissionIds = sameDay ? (dailyMissions?.claimedMissionIds || []) : [];
  const definitions = getDailyMissionDefinitions();

  const missions = definitions.map((mission) => {
    const progress = Math.max(0, Number(stats?.[mission.statKey] || 0));
    const completed = progress >= mission.target;
    const claimed = claimedMissionIds.includes(mission.id);

    return {
      ...mission,
      progress,
      completed,
      claimed,
    };
  });

  return {
    dateKey,
    missions,
    completedMissionIds: missions.filter((mission) => mission.completed).map((mission) => mission.id),
    claimedMissionIds,
    totalXpClaimed: sameDay ? Number(dailyMissions?.totalXpClaimed || 0) : 0,
  };
}

function serializeProfileUser(user) {
  const stats = normalizeStats(user.profileStats || {});
  const baseXp = calculateProfileXp(stats);
  const missionBonus = Number(user.dailyMissions?.totalXpClaimed || 0);
  const achievementBonus = (user.achievements || []).reduce((sum, achievement) => sum + Number(achievement.xpReward || 0), 0);
  const profileXp = Math.max(Number(user.profileXp || 0), baseXp + missionBonus + achievementBonus);
  const profileLevel = calculateProfileLevel(profileXp);
  const currentLevelXp = xpForLevel(profileLevel);
  const nextLevelXp = xpForLevel(profileLevel + 1);

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    statusMessage: user.statusMessage,
    favoritePlatforms: user.favoritePlatforms,
    profileBadges: user.profileBadges || [],
    profileXp,
    profileLevel,
    profileFrame: user.profileFrame || "rookie",
    profileStats: stats,
    achievements: user.achievements || [],
    dailyMissions: buildMissionState(stats, user.dailyMissions || {}),
    currentLevelXp,
    nextLevelXp,
  };
}

async function refreshUserProgress(user, statsInput = null) {
  const stats = normalizeStats(statsInput || user.profileStats || {}, user.profileStats || {});
  const baseXp = calculateProfileXp(stats);
  const oldAchievements = user.achievements || [];
  const oldAchievementIds = new Set(oldAchievements.map((item) => item.id));

  const previewLevel = calculateProfileLevel(Math.max(user.profileXp || 0, baseXp));
  const unlockedNow = buildAchievementDefinitions(stats, previewLevel)
    .filter((achievement) => achievement.unlocked && !oldAchievementIds.has(achievement.id))
    .map((achievement) => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
      unlockedAt: new Date(),
    }));

  const achievements = [...oldAchievements, ...unlockedNow];
  const achievementBonus = achievements.reduce((sum, item) => sum + Number(item.xpReward || 0), 0);
  const missionBonus = Number(user.dailyMissions?.totalXpClaimed || 0);
  const profileXp = baseXp + achievementBonus + missionBonus;
  const profileLevel = calculateProfileLevel(profileXp);
  const profileBadges = buildProfileBadges(user.profileBadges || [], stats, profileLevel, achievements);
  const profileFrame = pickProfileFrame(profileLevel, profileBadges);

  user.profileStats = stats;
  user.achievements = achievements;
  user.profileXp = profileXp;
  user.profileLevel = profileLevel;
  user.profileBadges = profileBadges;
  user.profileFrame = profileFrame;
  user.lastProfileSyncAt = new Date();

  return { user, unlockedNow };
}

router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user });
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

    res.json({ message: "Avatar güncellendi.", user });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ message: "Avatar yüklenemedi." });
  }
});

router.get("/profile-summary", protect, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json({ user: serializeProfileUser(user) });
});

router.patch("/profile/progress", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { user: updatedUser, unlockedNow } = await refreshUserProgress(user, req.body?.stats || {});
    await updatedUser.save();

    res.json({
      message: "Profil ilerlemesi güncellendi.",
      user: serializeProfileUser(updatedUser),
      unlockedAchievements: unlockedNow,
    });
  } catch (error) {
    console.error("Profile progress update error:", error);
    res.status(500).json({ message: "Profil ilerlemesi güncellenemedi." });
  }
});

router.patch("/missions/claim", protect, async (req, res) => {
  try {
    const missionId = String(req.body?.missionId || "");
    const user = await User.findById(req.user._id);
    const { user: refreshedUser } = await refreshUserProgress(user, req.body?.stats || user.profileStats || {});
    const missionState = buildMissionState(refreshedUser.profileStats || {}, refreshedUser.dailyMissions || {});
    const mission = missionState.missions.find((item) => item.id === missionId);

    if (!mission) return res.status(404).json({ message: "Görev bulunamadı." });
    if (!mission.completed) return res.status(400).json({ message: "Görev henüz tamamlanmadı." });
    if (mission.claimed) return res.status(400).json({ message: "Bu görev ödülü zaten alındı." });

    const dateKey = getDateKey();
    const sameDay = refreshedUser.dailyMissions?.dateKey === dateKey;

    refreshedUser.dailyMissions = {
      dateKey,
      claimedMissionIds: [
        ...(sameDay ? refreshedUser.dailyMissions?.claimedMissionIds || [] : []),
        missionId,
      ],
      completedMissionIds: missionState.completedMissionIds,
      totalXpClaimed: Number(sameDay ? refreshedUser.dailyMissions?.totalXpClaimed || 0 : 0) + Number(mission.xpReward || 0),
      updatedAt: new Date(),
    };

    await refreshUserProgress(refreshedUser, refreshedUser.profileStats || {});
    await refreshedUser.save();

    res.json({
      message: `${mission.title} ödülü alındı.`,
      claimedMission: mission,
      user: serializeProfileUser(refreshedUser),
    });
  } catch (error) {
    console.error("Mission claim error:", error);
    res.status(500).json({ message: "Görev ödülü alınamadı." });
  }
});

router.get("/leaderboard", protect, async (req, res) => {
  try {
    const users = await User.find()
      .select("username avatar profileXp profileLevel profileStats profileBadges profileFrame")
      .sort({ profileXp: -1, profileLevel: -1, updatedAt: -1 })
      .limit(25)
      .lean();

    res.json({
      users: users.map((user, index) => ({
        ...user,
        rank: index + 1,
      })),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Leaderboard alınamadı." });
  }
});

module.exports = router;
