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


function getCustomizationCatalog() {
  return [
    {
      id: "frame-neon",
      type: "frame",
      value: "neon",
      icon: "💜",
      title: "Neon Frame",
      description: "Profil fotoğrafına Vory neon çerçeve ekler.",
      costXp: 500,
      requiredLevel: 2,
    },
    {
      id: "frame-galaxy",
      type: "frame",
      value: "galaxy",
      icon: "🌌",
      title: "Galaxy Frame",
      description: "Mor galaksi glow çerçevesi.",
      costXp: 1200,
      requiredLevel: 4,
    },
    {
      id: "frame-cinema",
      type: "frame",
      value: "cinema",
      icon: "🎬",
      title: "Cinema Frame",
      description: "Film geceleri için kırmızı sinema çerçevesi.",
      costXp: 800,
      requiredLevel: 3,
    },
    {
      id: "frame-founder",
      type: "frame",
      value: "founder",
      icon: "👑",
      title: "Founder Frame",
      description: "Founder/early badge kullanıcıları için altın frame.",
      costXp: 0,
      requiredBadge: "Closed Beta Tester",
    },
    {
      id: "theme-galaxy",
      type: "theme",
      value: "galaxy",
      icon: "🌠",
      title: "Galaxy Profile Theme",
      description: "Profil kartına galaxy teması verir.",
      costXp: 1000,
      requiredLevel: 3,
    },
    {
      id: "theme-cinema",
      type: "theme",
      value: "cinema",
      icon: "🍿",
      title: "Cinema Profile Theme",
      description: "Profil kartını sinema havasına sokar.",
      costXp: 750,
      requiredLevel: 2,
    },
    {
      id: "theme-gaming",
      type: "theme",
      value: "gaming",
      icon: "🎮",
      title: "Gaming Profile Theme",
      description: "Yeşil/cyan gaming profil teması.",
      costXp: 900,
      requiredLevel: 3,
    },
    {
      id: "glow-founder",
      type: "glow",
      value: "founder",
      icon: "💎",
      title: "Founder Glow",
      description: "Profil kartına premium founder glow efekti verir.",
      costXp: 0,
      requiredBadge: "Closed Beta Tester",
    },
    {
      id: "glow-fire",
      type: "glow",
      value: "fire",
      icon: "🔥",
      title: "Fire Glow",
      description: "Host master havası veren sıcak glow.",
      costXp: 1400,
      requiredLevel: 5,
    },
  ];
}

function userHasRequiredBadge(user, requiredBadge = "") {
  if (!requiredBadge) return true;
  const badges = (user.profileBadges || []).map((badge) => String(badge).toLowerCase());
  return badges.some((badge) => badge.includes(String(requiredBadge).toLowerCase()));
}

function buildCustomizationState(user) {
  const catalog = getCustomizationCatalog();
  const purchased = new Set(user.profileInventory?.purchasedItemIds || []);
  const unlocked = new Set(user.profileInventory?.unlockedItemIds || []);
  const equipped = new Set(user.profileInventory?.equippedItemIds || []);

  const items = catalog.map((item) => {
    const levelOk = Number(user.profileLevel || 1) >= Number(item.requiredLevel || 1);
    const badgeOk = userHasRequiredBadge(user, item.requiredBadge || "");
    const freeUnlock = Number(item.costXp || 0) === 0 && levelOk && badgeOk;
    const owned = purchased.has(item.id) || unlocked.has(item.id) || freeUnlock;

    return {
      ...item,
      owned,
      equipped: equipped.has(item.id) || user.activeCustomizations?.[item.type] === item.value,
      locked: !levelOk || !badgeOk,
      lockReason: !levelOk
        ? `Level ${item.requiredLevel} gerekli`
        : !badgeOk
          ? `${item.requiredBadge} badge gerekli`
          : "",
    };
  });

  return {
    items,
    active: {
      frame: user.activeCustomizations?.frame || user.profileFrame || "rookie",
      theme: user.activeCustomizations?.theme || user.profileTheme || "vory",
      glow: user.activeCustomizations?.glow || "none",
      badgeShowcase: user.activeCustomizations?.badgeShowcase || [],
    },
    totalSpentXp: Number(user.profileInventory?.totalSpentXp || 0),
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
    lastUsernameChangedAt: user.lastUsernameChangedAt || null,
    favoritePlatforms: user.favoritePlatforms,
    profileBadges: user.profileBadges || [],
    profileXp,
    profileLevel,
    profileFrame: user.profileFrame || "rookie",
    profileStats: stats,
    achievements: user.achievements || [],
    dailyMissions: buildMissionState(stats, user.dailyMissions || {}),
    customization: buildCustomizationState(user),
    activeCustomizations: buildCustomizationState(user).active,
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
  const profileFrame = user.activeCustomizations?.frame || pickProfileFrame(profileLevel, profileBadges);

  user.profileStats = stats;
  user.achievements = achievements;
  user.profileXp = profileXp;
  user.profileLevel = profileLevel;
  user.profileBadges = profileBadges;
  user.profileFrame = profileFrame;
  user.lastProfileSyncAt = new Date();

  return { user, unlockedNow };
}


function buildCreatorBadges(user = {}) {
  const badges = new Set(user?.creatorProfile?.creatorBadges || []);
  const stats = user?.profileStats || {};
  const level = Number(user?.profileLevel || 1);
  const followersCount = Array.isArray(user?.followers) ? user.followers.length : 0;

  if (level >= 5 || followersCount >= 10) badges.add("Community Star");
  if (Number(stats.roomsJoined || 0) >= 25) badges.add("Top Host");
  if (Number(stats.mediaPlayed || 0) >= 25) badges.add("Movie Expert");
  if (followersCount >= 50) badges.add("Verified Creator");

  return Array.from(badges).slice(0, 6);
}

function serializeCreator(user, currentUserId = "") {
  if (!user) return null;
  const followers = (user.followers || []).map((id) => String(id));
  const following = (user.following || []).map((id) => String(id));
  const stats = user.profileStats || {};
  const creatorProfile = user.creatorProfile || {};
  const watchHours = Math.round(Number(stats.watchSeconds || 0) / 3600);

  return {
    _id: String(user._id || ""),
    username: user.username || "creator",
    avatar: user.avatar || "",
    profileLevel: user.profileLevel || 1,
    profileXp: user.profileXp || 0,
    profileBadges: user.profileBadges || [],
    creatorProfile: {
      enabled: creatorProfile.enabled !== false,
      displayName: creatorProfile.displayName || user.username || "Creator",
      headline: creatorProfile.headline || "VoryApp creator",
      category: creatorProfile.category || "Watch Party",
      featured: !!creatorProfile.featured,
      totalRoomsHosted: creatorProfile.totalRoomsHosted || stats.roomsJoined || 0,
      totalWatchHours: creatorProfile.totalWatchHours || watchHours,
      lastLiveAt: creatorProfile.lastLiveAt || null,
    },
    creatorBadges: buildCreatorBadges(user),
    followersCount: followers.length,
    followingCount: following.length,
    isFollowedByMe: currentUserId ? followers.includes(String(currentUserId)) : false,
    profileStats: stats,
  };
}

function serializeCreatorEvent(event = {}, user = {}, currentUserId = "") {
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const startsAtMs = startsAt ? startsAt.getTime() : null;
  const now = Date.now();
  const liveNow = !!startsAtMs && now >= startsAtMs && now <= startsAtMs + 3 * 60 * 60 * 1000;
  const reminderUserIds = Array.isArray(event.reminderUserIds)
    ? event.reminderUserIds.map((id) => String(id))
    : [];

  return {
    id: event.id || `${user._id || "creator"}-${event.title || "event"}`,
    title: event.title || "Creator Event",
    description: event.description || "",
    icon: event.icon || "📅",
    startsAt: startsAtMs,
    whenLabel: startsAt ? startsAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "yakında",
    roomCode: event.roomCode || "",
    creatorId: String(user._id || ""),
    creatorUsername: user.username || "creator",
    reminderCount: reminderUserIds.length,
    remindedByMe: currentUserId ? reminderUserIds.includes(String(currentUserId)) : false,
    liveNow,
    status: liveNow ? "live" : startsAtMs && startsAtMs > now ? "upcoming" : "past",
  };
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


router.patch("/profile/settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const nextUsername = String(req.body?.username || user.username || "").trim();
    const nextBio = String(req.body?.bio || "").trim().slice(0, 180);
    const nextStatusMessage = String(req.body?.statusMessage || "").trim().slice(0, 90);
    const nextPlatforms = Array.isArray(req.body?.favoritePlatforms)
      ? req.body.favoritePlatforms.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
      : [];

    const usernameChanged = nextUsername && nextUsername !== user.username;

    if (usernameChanged) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(nextUsername)) {
        return res.status(400).json({ message: "Kullanıcı adı 3-20 karakter olmalı. Harf, rakam ve _ kullan." });
      }

      const lastChange = user.lastUsernameChangedAt ? new Date(user.lastUsernameChangedAt).getTime() : 0;
      const cooldownMs = 7 * 24 * 60 * 60 * 1000;
      const remainingMs = lastChange + cooldownMs - Date.now();

      if (lastChange && remainingMs > 0) {
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        return res.status(429).json({ message: `Kullanıcı adını ${remainingDays} gün sonra tekrar değiştirebilirsin.` });
      }

      const exists = await User.findOne({ username: nextUsername, _id: { $ne: user._id } });
      if (exists) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten alınmış." });
      }

      user.username = nextUsername;
      user.lastUsernameChangedAt = new Date();
    }

    user.bio = nextBio;
    user.statusMessage = nextStatusMessage;
    user.favoritePlatforms = nextPlatforms;

    await user.save();

    const cleanUser = await User.findById(user._id).select("-password");

    res.json({
      message: usernameChanged ? "Profil güncellendi. Kullanıcı adını tekrar değiştirmek için 7 gün bekle." : "Profil güncellendi.",
      user: serializeProfileUser(cleanUser),
    });
  } catch (error) {
    console.error("Profile settings update error:", error);
    res.status(500).json({ message: "Profil güncellenemedi." });
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


router.get("/customization/catalog", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    await refreshUserProgress(user, user.profileStats || {});
    await user.save();

    res.json({
      customization: buildCustomizationState(user),
      user: serializeProfileUser(user),
    });
  } catch (error) {
    console.error("Customization catalog error:", error);
    res.status(500).json({ message: "Customization store alınamadı." });
  }
});

router.patch("/customization/unlock", protect, async (req, res) => {
  try {
    const itemId = String(req.body?.itemId || "");
    const catalogItem = getCustomizationCatalog().find((item) => item.id === itemId);
    if (!catalogItem) return res.status(404).json({ message: "Store item bulunamadı." });

    const user = await User.findById(req.user._id);
    await refreshUserProgress(user, req.body?.stats || user.profileStats || {});

    const customization = buildCustomizationState(user);
    const stateItem = customization.items.find((item) => item.id === itemId);
    if (!stateItem) return res.status(404).json({ message: "Store item bulunamadı." });
    if (stateItem.locked) return res.status(400).json({ message: stateItem.lockReason || "Bu item henüz kilitli." });
    if (stateItem.owned) return res.status(400).json({ message: "Bu cosmetic zaten açık." });

    const currentSpent = Number(user.profileInventory?.totalSpentXp || 0);
    const spendableXp = Math.max(0, Number(user.profileXp || 0) - currentSpent);
    const costXp = Number(catalogItem.costXp || 0);
    if (spendableXp < costXp) {
      return res.status(400).json({ message: `Yetersiz XP. Gerekli: ${costXp} XP` });
    }

    const purchasedItemIds = Array.from(new Set([...(user.profileInventory?.purchasedItemIds || []), itemId]));
    const unlockedItemIds = Array.from(new Set([...(user.profileInventory?.unlockedItemIds || []), itemId]));

    user.profileInventory = {
      ...(user.profileInventory || {}),
      purchasedItemIds,
      unlockedItemIds,
      equippedItemIds: user.profileInventory?.equippedItemIds || [],
      totalSpentXp: currentSpent + costXp,
      updatedAt: new Date(),
    };

    await user.save();

    res.json({
      message: `${catalogItem.title} açıldı.`,
      item: catalogItem,
      customization: buildCustomizationState(user),
      user: serializeProfileUser(user),
    });
  } catch (error) {
    console.error("Customization unlock error:", error);
    res.status(500).json({ message: "Cosmetic açılamadı." });
  }
});

router.patch("/customization/equip", protect, async (req, res) => {
  try {
    const itemId = String(req.body?.itemId || "");
    const catalogItem = getCustomizationCatalog().find((item) => item.id === itemId);
    if (!catalogItem) return res.status(404).json({ message: "Store item bulunamadı." });

    const user = await User.findById(req.user._id);
    await refreshUserProgress(user, req.body?.stats || user.profileStats || {});

    const customization = buildCustomizationState(user);
    const stateItem = customization.items.find((item) => item.id === itemId);
    if (!stateItem?.owned) return res.status(400).json({ message: "Önce bu cosmetic'i unlock et." });

    const currentEquipped = (user.profileInventory?.equippedItemIds || []).filter((id) => {
      const item = getCustomizationCatalog().find((catalog) => catalog.id === id);
      return item && item.type !== catalogItem.type;
    });

    user.activeCustomizations = {
      ...(user.activeCustomizations || {}),
      [catalogItem.type]: catalogItem.value,
    };

    if (catalogItem.type === "frame") user.profileFrame = catalogItem.value;
    if (catalogItem.type === "theme") user.profileTheme = catalogItem.value;

    user.profileInventory = {
      ...(user.profileInventory || {}),
      unlockedItemIds: Array.from(new Set([...(user.profileInventory?.unlockedItemIds || []), itemId])),
      purchasedItemIds: user.profileInventory?.purchasedItemIds || [],
      equippedItemIds: [...currentEquipped, itemId],
      totalSpentXp: Number(user.profileInventory?.totalSpentXp || 0),
      updatedAt: new Date(),
    };

    await user.save();

    res.json({
      message: `${catalogItem.title} aktif edildi.`,
      item: catalogItem,
      customization: buildCustomizationState(user),
      user: serializeProfileUser(user),
    });
  } catch (error) {
    console.error("Customization equip error:", error);
    res.status(500).json({ message: "Cosmetic aktif edilemedi." });
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


router.get("/creators/hub", protect, async (req, res) => {
  try {
    const currentUserId = String(req.user?._id || "");
    const creators = await User.find({})
      .select("username avatar profileLevel profileXp profileBadges profileStats creatorProfile followers following creatorEvents")
      .sort({ profileXp: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    const trendingCreators = creators
      .map((user) => serializeCreator(user, currentUserId))
      .filter(Boolean)
      .sort((a, b) => {
        const scoreA = Number(a.followersCount || 0) * 8 + Number(a.profileXp || 0) + Number(a.creatorProfile?.totalRoomsHosted || 0) * 20;
        const scoreB = Number(b.followersCount || 0) * 8 + Number(b.profileXp || 0) + Number(b.creatorProfile?.totalRoomsHosted || 0) * 20;
        return scoreB - scoreA;
      })
      .slice(0, 12);

    const liveEvents = creators
      .flatMap((user) => (user.creatorEvents || []).map((event) => serializeCreatorEvent(event, user, currentUserId)))
      .filter((event) => event.title)
      .sort((a, b) => Number(a.startsAt || 0) - Number(b.startsAt || 0))
      .slice(0, 8);

    const categoryCounts = new Map();
    trendingCreators.forEach((creator) => {
      const category = creator.creatorProfile?.category || "Watch Party";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const featuredCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)
      .slice(0, 8);

    res.json({
      trendingCreators,
      liveEvents,
      featuredCategories,
      featuredRooms: [],
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Creator hub alınamadı:", error);
    res.status(500).json({ message: "Creator hub alınamadı." });
  }
});

router.patch("/creators/follow/:creatorId", protect, async (req, res) => {
  try {
    const currentUserId = String(req.user?._id || "");
    const creatorId = String(req.params.creatorId || "");

    if (!creatorId || creatorId === currentUserId) {
      return res.status(400).json({ message: "Bu creator takip edilemez." });
    }

    const creator = await User.findById(creatorId);
    const me = await User.findById(currentUserId);

    if (!creator || !me) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const followers = (creator.followers || []).map((id) => String(id));
    const following = (me.following || []).map((id) => String(id));
    const alreadyFollowing = followers.includes(currentUserId);

    if (alreadyFollowing) {
      creator.followers = creator.followers.filter((id) => String(id) !== currentUserId);
      me.following = me.following.filter((id) => String(id) !== creatorId);
    } else {
      creator.followers = Array.from(new Set([...(creator.followers || []), me._id]));
      me.following = Array.from(new Set([...(me.following || []), creator._id]));
      creator.creatorProfile = {
        ...(creator.creatorProfile || {}),
        enabled: true,
      };
    }

    await creator.save();
    await me.save();

    res.json({
      message: alreadyFollowing ? "Creator takipten çıkarıldı." : "Creator takip edildi.",
      following: !alreadyFollowing,
      creator: serializeCreator(creator.toObject(), currentUserId),
    });
  } catch (error) {
    console.error("Creator follow hatası:", error);
    res.status(500).json({ message: "Creator takip işlemi yapılamadı." });
  }
});

router.patch("/creator/settings", protect, async (req, res) => {
  try {
    const { displayName, headline, category, enabled } = req.body || {};
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    user.creatorProfile = {
      ...(user.creatorProfile || {}),
      enabled: enabled !== undefined ? !!enabled : true,
      displayName: String(displayName || user.creatorProfile?.displayName || user.username || "").slice(0, 60),
      headline: String(headline || user.creatorProfile?.headline || "VoryApp creator").slice(0, 120),
      category: String(category || user.creatorProfile?.category || "Watch Party").slice(0, 40),
    };

    await user.save();

    res.json({
      message: "Creator profili güncellendi.",
      creator: serializeCreator(user.toObject(), String(req.user._id)),
      user: user.toObject(),
    });
  } catch (error) {
    console.error("Creator ayar hatası:", error);
    res.status(500).json({ message: "Creator profili güncellenemedi." });
  }
});

router.post("/creator/events", protect, async (req, res) => {
  try {
    const { title, description, icon, startsAt, roomCode } = req.body || {};
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    if (!title) return res.status(400).json({ message: "Event başlığı gerekli." });

    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(title).slice(0, 80),
      description: String(description || "").slice(0, 240),
      icon: String(icon || "📅").slice(0, 4),
      startsAt: startsAt ? new Date(startsAt) : null,
      roomCode: String(roomCode || "").trim().toUpperCase(),
      reminderUserIds: [],
      createdAt: new Date(),
    };

    user.creatorProfile = {
      ...(user.creatorProfile || {}),
      enabled: true,
    };
    user.creatorEvents = [event, ...(user.creatorEvents || [])].slice(0, 12);
    await user.save();

    res.status(201).json({
      message: "Creator event oluşturuldu.",
      event: serializeCreatorEvent(event, user.toObject(), String(req.user._id)),
      user: user.toObject(),
    });
  } catch (error) {
    console.error("Creator event oluşturulamadı:", error);
    res.status(500).json({ message: "Creator event oluşturulamadı." });
  }
});

router.patch("/creator/events/:eventId/remind", protect, async (req, res) => {
  try {
    const eventId = String(req.params.eventId || "");
    const creatorId = String(req.body?.creatorId || "");
    const currentUserId = String(req.user?._id || "");

    const query = creatorId
      ? { _id: creatorId, "creatorEvents.id": eventId }
      : { "creatorEvents.id": eventId };

    const creator = await User.findOne(query);

    if (!creator) {
      return res.status(404).json({ message: "Creator event bulunamadı." });
    }

    const event = (creator.creatorEvents || []).find((item) => String(item.id) === eventId);

    if (!event) {
      return res.status(404).json({ message: "Creator event bulunamadı." });
    }

    const reminderUserIds = Array.isArray(event.reminderUserIds)
      ? event.reminderUserIds.map((id) => String(id))
      : [];
    const alreadyReminded = reminderUserIds.includes(currentUserId);

    event.reminderUserIds = alreadyReminded
      ? reminderUserIds.filter((id) => id !== currentUserId)
      : Array.from(new Set([...reminderUserIds, currentUserId]));

    await creator.save();

    res.json({
      message: alreadyReminded ? "Event hatırlatıcısı kaldırıldı." : "Event hatırlatıcısı eklendi.",
      reminded: !alreadyReminded,
      event: serializeCreatorEvent(event, creator.toObject(), currentUserId),
    });
  } catch (error) {
    console.error("Creator event reminder hatası:", error);
    res.status(500).json({ message: "Event reminder güncellenemedi." });
  }
});

module.exports = router;
