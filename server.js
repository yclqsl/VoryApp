require("dotenv").config();

const dns = require("dns");
const path = require("path");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const rooms = {};
const onlineUsers = new Map();
const voiceRooms = {};
const voiceListeners = {};
const backgroundSockets = new Map();
const backgroundVoiceGraceTimers = new Map();
const partyInviteCooldowns = new Map();
const PARTY_INVITE_COOLDOWN_MS = 60 * 1000;
const PUBLIC_EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const publicEmptyRoomTimers = new Map();

// Vory 1.1 - Voice + Video Sync Fix
// Daha gevşek eşikler + response throttle: voice chat açılınca video sürekli seek döngüsüne girmesin.
const SYNC_DRIFT_WARN_SECONDS = 1.0;
const SYNC_HARD_DRIFT_SECONDS = 1.85;
const SYNC_HEARTBEAT_MIN_MS = 1800;
const SYNC_RESPONSE_MIN_MS = 2200;

const syncClients = {};
const syncHeartbeatLimiter = {};
const syncResponseLimiter = {};
// Vory 5.5.3B: mobile micro-stutter fix is client-side; server sync throttle stays stable.

// Vory 5.5.1L - YouTube quota saver
// Search API pahalıdır; aynı sorguyu RAM cache'ten döndürüp kısa aralıkta spam'i kesiyoruz.
const YOUTUBE_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const YOUTUBE_SEARCH_THROTTLE_MS = 900;
const YOUTUBE_SEARCH_CACHE_MAX = 180;
const youtubeSearchCache = new Map();
const youtubeSearchLimiter = new Map();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const Feedback = require("./models/Feedback");
const DirectMessage = require("./models/DirectMessage");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const inviteRoutes = require("./routes/inviteRoutes");

const app = express();

// Vory 5.5.3E.11.9 CORS final fix
// www / non-www domain, localhost and Render preview origins are accepted.
// We also set headers manually before cors() so failed preflight/Render edge cases do not drop ACAO.
const allowedOrigins = new Set([
  "https://voryapp.com",
  "https://www.voryapp.com",
  "https://voryapp.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function isAllowedOrigin(origin = "") {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    return (
      allowedOrigins.has(origin) ||
      url.hostname === "voryapp.com" ||
      url.hostname === "www.voryapp.com" ||
      url.hostname.endsWith(".voryapp.com") ||
      url.hostname.endsWith(".onrender.com") ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function resolveCorsOrigin(origin = "") {
  return isAllowedOrigin(origin) ? origin || "*" : "https://voryapp.com";
}

const corsOptions = {
  origin(origin, callback) {
    callback(null, resolveCorsOrigin(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-key", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const corsOrigin = resolveCorsOrigin(origin);

  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/invites", inviteRoutes);

app.use(express.static("public"));


app.post("/api/feedback", async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      rating,
      roomCode,
      username,
      userId,
      userAgent,
      appVersion,
      metadata,
    } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({
        message: "Başlık ve açıklama gerekli.",
      });
    }

    const feedback = await Feedback.create({
      type: type || "bug",
      title: String(title).slice(0, 140),
      message: String(message).slice(0, 3000),
      rating: Math.max(1, Math.min(5, Number(rating) || Number(metadata?.rating) || 5)),
      roomCode: roomCode || "",
      username: username || "Anonim",
      userId: userId || "",
      userAgent: userAgent || "",
      appVersion: appVersion || "beta",
      metadata: metadata || {},
      status: "open",
    });

    res.status(201).json({
      message: "Feedback alındı.",
      feedback,
    });
  } catch (error) {
    console.error("Feedback kaydedilemedi:", error);

    res.status(500).json({
      message: "Feedback kaydedilemedi.",
    });
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.query.adminKey;

    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        message: "Yetkisiz.",
      });
    }

    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error("Feedback okunamadı:", error);

    res.status(500).json({
      message: "Feedback okunamadı.",
    });
  }
});

app.patch("/api/feedback/:id", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.query.adminKey;

    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        message: "Yetkisiz.",
      });
    }

    const status = req.body?.status;

    if (!["open", "reviewing", "closed"].includes(status)) {
      return res.status(400).json({
        message: "Geçersiz feedback status.",
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback bulunamadı.",
      });
    }

    res.json({
      message: "Feedback güncellendi.",
      feedback,
    });
  } catch (error) {
    console.error("Feedback güncellenemedi:", error);

    res.status(500).json({
      message: "Feedback güncellenemedi.",
    });
  }
});

app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.query.adminKey;

    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        message: "Yetkisiz.",
      });
    }

    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback bulunamadı.",
      });
    }

    res.json({
      message: "Feedback silindi.",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Feedback silinemedi:", error);

    res.status(500).json({
      message: "Feedback silinemedi.",
    });
  }
});


function normalizeYouTubeQuery(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getYouTubeSearchCacheKey({ query = "", maxResults = 10, pageToken = "", shortsMode = false }) {
  return [
    shortsMode ? "shorts" : "home",
    normalizeYouTubeQuery(query).toLowerCase(),
    String(maxResults || 10),
    String(pageToken || ""),
  ].join(":");
}

function getClientRateKey(req) {
  return String(
    req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "anonymous"
  ).split(",")[0].trim();
}

function getCachedYouTubeSearch(cacheKey) {
  const cached = youtubeSearchCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() - Number(cached.cachedAt || 0) > YOUTUBE_SEARCH_CACHE_TTL_MS) {
    youtubeSearchCache.delete(cacheKey);
    return null;
  }

  return {
    ...cached.payload,
    cached: true,
  };
}

function setCachedYouTubeSearch(cacheKey, payload) {
  youtubeSearchCache.set(cacheKey, {
    cachedAt: Date.now(),
    payload,
  });

  if (youtubeSearchCache.size > YOUTUBE_SEARCH_CACHE_MAX) {
    const oldestKey = youtubeSearchCache.keys().next().value;
    if (oldestKey) youtubeSearchCache.delete(oldestKey);
  }
}

function isYouTubeQuotaError(data = {}) {
  const message = String(data?.error?.message || data?.message || "").toLowerCase();
  const errors = Array.isArray(data?.error?.errors) ? data.error.errors : [];

  return (
    (data?.error?.code === 403 || data?.error?.code === 429) &&
    (
      message.includes("quota") ||
      errors.some((item) =>
        String(item?.reason || "").toLowerCase().includes("quota") ||
        String(item?.message || "").toLowerCase().includes("quota")
      )
    )
  );
}


app.get("/api/youtube/search", async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "YouTube API key eksik. Render Environment içine YOUTUBE_API_KEY ekle.",
      });
    }

    const query = normalizeYouTubeQuery(req.query.q || "");
    const maxResults = Math.max(1, Math.min(12, Number(req.query.maxResults) || 10));
    const pageToken = String(req.query.pageToken || "").trim();
    const shortsMode = String(req.query.shorts || "") === "1";

    if (query.length < 3) {
      return res.json({ items: [], nextPageToken: "", prevPageToken: "" });
    }

    const cacheKey = getYouTubeSearchCacheKey({ query, maxResults, pageToken, shortsMode });
    const cachedPayload = getCachedYouTubeSearch(cacheKey);

    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const rateKey = getClientRateKey(req);
    const now = Date.now();
    const lastSearchAt = youtubeSearchLimiter.get(rateKey) || 0;

    if (now - lastSearchAt < YOUTUBE_SEARCH_THROTTLE_MS) {
      return res.status(429).json({
        message: "YouTube araması çok hızlı yenilendi. Bir saniye sonra tekrar dene.",
      });
    }

    youtubeSearchLimiter.set(rateKey, now);

    const searchParams = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: shortsMode ? `${query} shorts` : query,
      maxResults: String(maxResults),
      safeSearch: "moderate",
      key: apiKey,
      order: req.query.order ? String(req.query.order) : "relevance",
    });

    if (pageToken) {
      searchParams.set("pageToken", pageToken);
    }

    if (shortsMode) {
      searchParams.set("videoDuration", "short");
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API error:", data);

      if (isYouTubeQuotaError(data)) {
        return res.status(response.status).json({
          message: data?.error?.message || "YouTube arama kotası doldu. Yeni API key/proje kotasını kontrol et.",
          quotaExceeded: true,
        });
      }

      return res.status(response.status).json({
        message: data?.error?.message || "YouTube araması başarısız.",
      });
    }

    const items = (data.items || [])
      .filter((item) => item?.id?.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        id: item.id.videoId,
        title: item.snippet?.title || "YouTube Video",
        channelTitle: item.snippet?.channelTitle || "YouTube",
        description: item.snippet?.description || "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        publishedAt: item.snippet?.publishedAt || "",
      }));

    const payload = {
      items,
      nextPageToken: data.nextPageToken || "",
      prevPageToken: data.prevPageToken || "",
    };

    setCachedYouTubeSearch(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error("YouTube search failed:", error);
    res.status(500).json({
      message: "YouTube araması yapılamadı.",
    });
  }
});

app.get("/api/youtube/suggestions", async (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();

  const seed = [
    "elraen",
    "elif sinem",
    "semicenk",
    "trending music",
    "valorant",
    "komedi",
    "film izle",
    "podcast",
    "türkçe rap",
    "oyun videoları",
    "lofi",
    "deep house",
    "shorts",
  ];

  const suggestions = query
    ? seed
        .filter((item) => item.toLowerCase().includes(query))
        .concat([
          `${query} izle`,
          `${query} yeni`,
          `${query} şarkı`,
          `${query} shorts`,
        ])
        .filter((item, index, array) => item && array.indexOf(item) === index)
        .slice(0, 10)
    : seed.slice(0, 8);

  res.json({ suggestions });
});

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, resolveCorsOrigin(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

function createRoomCode() {
  let code = Math.random().toString(36).substring(2, 8).toUpperCase();

  while (rooms[code]) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  return code;
}

function normalizeRoomCode(roomCode = "") {
  return String(roomCode).trim().toUpperCase();
}

function getDefaultRoomSettings() {
  return {
    roomLocked: false,
    inviteOnly: false,
    muteAll: false,
    chatLocked: false,
    publicRoom: false,
  };
}

function getDefaultRoomTheme() {
  return "neon";
}

function getPublicRoomTheme(roomCode) {
  return rooms[roomCode]?.theme || getDefaultRoomTheme();
}

function isValidRoomTheme(theme) {
  return ["neon", "cinema", "galaxy", "gaming"].includes(String(theme || "").toLowerCase());
}

function getPublicRoomSettings(roomCode) {
  return rooms[roomCode]?.settings || getDefaultRoomSettings();
}

function isHost(roomCode, socketId) {
  return rooms[roomCode]?.host === socketId;
}

function getSyncedVideoState(room) {
  const state = room.videoState || {
    isPlaying: false,
    currentTime: 0,
    creatorRoom: true,
    category: room.category || "Watch Party",
    updatedAt: Date.now(),
  };

  if (!state.isPlaying) return state;

  const elapsed = (Date.now() - (state.updatedAt || Date.now())) / 1000;

  return {
    ...state,
    currentTime: (state.currentTime || 0) + elapsed,
    updatedAt: Date.now(),
  };
}

function shouldEmitSyncResponse(roomCode, socketId, minMs = SYNC_RESPONSE_MIN_MS) {
  const key = `${roomCode}:${socketId}`;
  const now = Date.now();
  const last = syncResponseLimiter[key] || 0;

  if (now - last < minMs) return false;

  syncResponseLimiter[key] = now;
  return true;
}



function getOnlineUserBySocketId(socketId) {
  for (const user of onlineUsers.values()) {
    if (user.socketId === socketId) return user;
  }

  return null;
}

function normalizePresenceActivity(activity = "idle") {
  const cleanActivity = String(activity || "idle").toLowerCase();
  const allowedActivities = new Set([
    "online",
    "idle",
    "away",
    "in-room",
    "watching",
    "voice",
  ]);

  return allowedActivities.has(cleanActivity) ? cleanActivity : "idle";
}

function getPresenceStatusFromActivity(activity = "idle") {
  const cleanActivity = normalizePresenceActivity(activity);
  return cleanActivity === "away" || cleanActivity === "idle" ? "idle" : "online";
}

function getOnlineUserById(userId) {
  return onlineUsers.get(String(userId || ""));
}

function serializeDM(doc) {
  if (!doc) return null;

  const item = typeof doc.toObject === "function" ? doc.toObject() : doc;

  return {
    id: item.clientId || String(item._id || ""),
    _id: String(item._id || ""),
    fromUserId: String(item.fromUserId || ""),
    toUserId: String(item.toUserId || ""),
    fromUsername: item.fromUsername || "Kullanıcı",
    toUsername: item.toUsername || "Kullanıcı",
    message: item.message || "",
    createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
    read: !!item.read,
  };
}

async function emitDMInboxSummary(socket, userId) {
  const cleanUserId = String(userId || "");
  if (!cleanUserId) return;

  const unreadMessages = await DirectMessage.find({
    toUserId: cleanUserId,
    read: false,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (!unreadMessages.length) {
    socket.emit("dm:inbox-summary", { total: 0, threads: [] });
    return;
  }

  const grouped = new Map();

  unreadMessages.forEach((message) => {
    const fromUserId = String(message.fromUserId || "");
    if (!fromUserId) return;

    const current = grouped.get(fromUserId) || {
      fromUserId,
      fromUsername: message.fromUsername || "Kullanıcı",
      count: 0,
      latestMessage: "",
      latestAt: 0,
    };

    const createdAt = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();

    current.count += 1;

    if (createdAt >= current.latestAt) {
      current.latestAt = createdAt;
      current.latestMessage = message.message || "";
      current.fromUsername = message.fromUsername || current.fromUsername;
    }

    grouped.set(fromUserId, current);
  });

  const threads = Array.from(grouped.values()).sort((a, b) => b.latestAt - a.latestAt);
  const total = threads.reduce((sum, item) => sum + item.count, 0);

  socket.emit("dm:inbox-summary", {
    total,
    threads,
  });

  threads.forEach((thread) => {
    socket.emit("notification:new", {
      id: `offline-dm-${thread.fromUserId}-${thread.latestAt}`,
      type: "dm",
      title: `${thread.fromUsername} kişisinden ${thread.count} yeni mesajınız var`,
      message: thread.latestMessage || "Yeni DM mesajın var.",
      createdAt: thread.latestAt || Date.now(),
      read: false,
      fromUserId: thread.fromUserId,
    });
  });
}

function emitPresence() {
  io.emit("online-users", Array.from(onlineUsers.values()));
  io.emit("presence-changed", Array.from(onlineUsers.values()));
}

function getRoomSummary(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return {
      roomCode,
      userCount: 0,
      voiceCount: 0,
      videoActive: false,
    };
  }

  return {
    roomCode,
    userCount: room.users?.length || 0,
    voiceCount: voiceRooms[roomCode] ? Object.keys(voiceRooms[roomCode]).length : 0,
    videoActive: !!room.videoUrl,
  };
}

function getVoiceUsers(roomCode) {
  const cleanRoomCode = normalizeRoomCode(roomCode);
  return Object.values(voiceRooms[cleanRoomCode] || {});
}

function getVoicePeerTargets(roomCode) {
  const speakers = Object.keys(voiceRooms[roomCode] || {});
  const listeners = Array.from(voiceListeners[roomCode] || []);
  return Array.from(new Set([...speakers, ...listeners]));
}

function emitVoiceUsers(roomCode, targetSocket = null) {
  const cleanRoomCode = normalizeRoomCode(roomCode);
  if (!cleanRoomCode) return;

  const payload = {
    roomCode: cleanRoomCode,
    users: getVoiceUsers(cleanRoomCode),
    updatedAt: Date.now(),
  };

  if (targetSocket) {
    targetSocket.emit("voice-users", payload);
    return;
  }

  // Rave mantığı: sadece voice kanalındakiler değil, odadaki herkes
  // kimin seste olduğunu anlık görür.
  io.to(cleanRoomCode).emit("voice-users", payload);
  io.to(`voice-${cleanRoomCode}`).emit("voice-users", payload);
}


function isPublicRoom(roomCode) {
  const settings = rooms[roomCode]?.settings || getDefaultRoomSettings();
  // Vory 5.5.3E.11.6:
  // Invite-only oda discovery'den düşmemeli; sadece "oda gizle" aktifse görünmez olsun.
  return !!settings.publicRoom && !settings.roomLocked;
}

function clearPublicEmptyTimer(roomCode) {
  const timer = publicEmptyRoomTimers.get(roomCode);

  if (timer) {
    clearTimeout(timer);
    publicEmptyRoomTimers.delete(roomCode);
  }

  if (rooms[roomCode]) {
    delete rooms[roomCode].emptyAt;
  }
}

function schedulePublicEmptyRoomCleanup(roomCode) {
  const room = rooms[roomCode];

  if (!room || !isPublicRoom(roomCode) || (room.users || []).length > 0) return;

  if (!room.emptyAt) {
    room.emptyAt = Date.now();
  }

  if (publicEmptyRoomTimers.has(roomCode)) return;

  const timer = setTimeout(() => {
    const currentRoom = rooms[roomCode];

    if (!currentRoom) {
      publicEmptyRoomTimers.delete(roomCode);
      return;
    }

    const stillEmpty = (currentRoom.users || []).length === 0;
    const stillPublic = isPublicRoom(roomCode);
    const emptyForMs = Date.now() - Number(currentRoom.emptyAt || Date.now());

    if (stillEmpty && stillPublic && emptyForMs >= PUBLIC_EMPTY_ROOM_TTL_MS) {
      delete rooms[roomCode];
      console.log(`Boş public oda timeout ile silindi: ${roomCode}`);
    }

    publicEmptyRoomTimers.delete(roomCode);
    emitDiscoveryRooms();
  }, PUBLIC_EMPTY_ROOM_TTL_MS + 250);

  publicEmptyRoomTimers.set(roomCode, timer);
}

function serializeDiscoveryUser(user = {}) {
  return {
    id: user.id || "",
    username: user.username || "Kullanıcı",
    avatar: user.avatar || "",
    isHost: !!user.isHost,
  };
}

function serializeDiscoveryRoom(roomCode) {
  const room = rooms[roomCode];

  if (!room) return null;

  const settings = room.settings || getDefaultRoomSettings();
  const hostUser = (room.users || []).find((user) => user.id === room.host) || room.users?.[0] || {};
  const summary = getRoomSummary(roomCode);
  const currentMedia = room.currentMedia || null;
  const previewThumbnail = currentMedia?.thumbnail || getYouTubeThumbnailFromUrl(currentMedia?.url || room.videoUrl || "");
  const roomUsers = (room.users || []).map(serializeDiscoveryUser);

  return {
    roomCode,
    host: room.host,
    hostUsername: hostUser.username || "Host",
    hostAvatar: hostUser.avatar || "",
    users: roomUsers,
    userCount: summary.userCount,
    voiceCount: summary.voiceCount,
    videoActive: summary.videoActive,
    theme: room.theme || getDefaultRoomTheme(),
    currentMedia,
    mediaTitle: currentMedia?.title || (room.videoUrl ? "Vory Media" : "Lobby"),
    mediaThumbnail: previewThumbnail || "",
    channelTitle: currentMedia?.channelTitle || currentMedia?.addedBy || "YouTube",
    isPublic: !!settings.publicRoom,
    locked: !!settings.roomLocked,
    inviteOnly: !!settings.inviteOnly,
    updatedAt: Date.now(),
  };
}

function sortDiscoveryRooms(roomList = []) {
  return [...roomList].sort((a, b) => {
    const scoreA = Number(a.userCount || 0) * 4 + Number(a.voiceCount || 0) * 2 + Number(a.videoActive || 0);
    const scoreB = Number(b.userCount || 0) * 4 + Number(b.voiceCount || 0) * 2 + Number(b.videoActive || 0);

    if (scoreB !== scoreA) return scoreB - scoreA;
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  });
}

function getDiscoveryRooms() {
  return sortDiscoveryRooms(
    Object.keys(rooms)
      .filter((roomCode) => isPublicRoom(roomCode))
      .map(serializeDiscoveryRoom)
      .filter((room) => room && room.isPublic && !room.locked && room.userCount > 0)
  );
}

function getInvitedDiscoveryRoomsForSocket(targetSocket = null) {
  if (!targetSocket) return [];

  const targetPresence = getOnlineUserBySocketId(targetSocket.id) || {};
  const targetUserId = String(targetPresence.userId || "");
  const targetSocketId = String(targetSocket.id || "");

  return sortDiscoveryRooms(
    Object.keys(rooms)
      .map((roomCode) => {
        const room = rooms[roomCode];
        if (!room || (room.users || []).length <= 0) return null;

        const invitedSocketIds = new Set((room.invitedSocketIds || []).map((id) => String(id || "")));
        const invitedUserIds = new Set((room.invitedUserIds || []).map((id) => String(id || "")));
        const isInvited = invitedSocketIds.has(targetSocketId) || (targetUserId && invitedUserIds.has(targetUserId));

        if (!isInvited) return null;

        const summary = serializeDiscoveryRoom(roomCode);
        if (!summary) return null;

        return {
          ...summary,
          isInvited: true,
          invited: true,
          inviteOnly: true,
        };
      })
      .filter(Boolean)
  );
}

function emitDiscoveryRooms(targetSocket = null) {
  if (targetSocket) {
    const invited = getInvitedDiscoveryRoomsForSocket(targetSocket);
    const invitedRoomCodes = new Set(
      invited.map((room) => normalizeRoomCode(room.roomCode))
    );
    const publicRooms = getDiscoveryRooms().filter(
      (room) => !invitedRoomCodes.has(normalizeRoomCode(room.roomCode))
    );

    targetSocket.emit("discovery-rooms-updated", {
      rooms: publicRooms,
      invitedRooms: invited,
      privateRooms: invited,
      updatedAt: Date.now(),
    });
    return;
  }

  io.sockets.sockets.forEach((connectedSocket) => {
    emitDiscoveryRooms(connectedSocket);
  });
}

function updateSocketPresence(socketId, patch = {}) {
  for (const [userId, user] of onlineUsers.entries()) {
    if (user.socketId !== socketId) continue;

    const nextActivity = normalizePresenceActivity(patch.activity || user.activity || "online");
    const now = Date.now();

    onlineUsers.set(userId, {
      ...user,
      ...patch,
      activity: nextActivity,
      status: patch.status || getPresenceStatusFromActivity(nextActivity),
      lastActiveAt: patch.lastActiveAt || (nextActivity === "away" ? user.lastActiveAt || now : now),
      lastSeenAt: patch.lastSeenAt || now,
      updatedAt: now,
    });

    return onlineUsers.get(userId);
  }

  return null;
}

function updateRoomPresence(socketId, roomCode, patch = {}) {
  const roomSummary = roomCode ? getRoomSummary(roomCode) : null;

  return updateSocketPresence(socketId, {
    roomCode: roomCode || "",
    roomSummary,
    ...patch,
  });
}

function clearSocketRoomPresence(socketId) {
  return updateSocketPresence(socketId, {
    roomCode: "",
    roomSummary: null,
    activity: "idle",
    voiceActive: false,
  });
}

function emitActivity(roomCode, payload = {}) {
  const activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: payload.type || "system",
    title: payload.title || "VoryApp",
    message: payload.message || "",
    username: payload.username || "",
    roomCode: roomCode || "",
    createdAt: Date.now(),
  };

  if (roomCode) {
    io.to(roomCode).emit("activity:new", activity);
    return;
  }

  io.emit("activity:new", activity);
}

function emitNotification(roomCode, payload = {}) {
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: payload.type || "system",
    title: payload.title || "VoryApp",
    message: payload.message || "",
    roomCode: roomCode || "",
    createdAt: Date.now(),
    read: false,
  };

  if (roomCode) {
    io.to(roomCode).emit("notification:new", notification);
    return;
  }

  io.emit("notification:new", notification);
}

function detectMediaType(url = "") {
  const cleanUrl = String(url).trim().toLowerCase();

  if (!cleanUrl) return "unknown";

  if (
    cleanUrl.includes("youtube.com") ||
    cleanUrl.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.includes(".mp4?") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.includes(".webm?") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.includes(".mov?")
  ) {
    return "direct-video";
  }

  return "url";
}

function getYouTubeVideoIdFromUrl(url = "") {
  try {
    const parsedUrl = new URL(String(url || "").trim());

    if (parsedUrl.hostname.includes("youtube.com")) {
      if (parsedUrl.pathname.includes("/shorts/")) {
        return parsedUrl.pathname.split("/shorts/")[1]?.split("?")[0] || "";
      }

      if (parsedUrl.pathname.includes("/embed/")) {
        return parsedUrl.pathname.split("/embed/")[1]?.split("?")[0] || "";
      }

      return parsedUrl.searchParams.get("v") || "";
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "").split("?")[0];
    }
  } catch {}

  return "";
}

function getYouTubeThumbnailFromUrl(url = "") {
  const videoId = getYouTubeVideoIdFromUrl(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}

function normalizeMediaItem({ videoUrl, title, addedBy, thumbnail, channelTitle }) {
  const cleanUrl = String(videoUrl || "").trim();

  if (!cleanUrl) return null;

  const mediaType = detectMediaType(cleanUrl);
  const fallbackThumbnail = mediaType === "youtube" ? getYouTubeThumbnailFromUrl(cleanUrl) : "";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url: cleanUrl,
    title: String(title || "").trim() || cleanUrl,
    thumbnail: String(thumbnail || fallbackThumbnail || "").trim(),
    channelTitle: String(channelTitle || "").trim(),
    type: mediaType,
    addedBy: addedBy || "Kullanıcı",
    addedAt: Date.now(),
    votes: 0,
    voters: [],
  };
}

function sortMediaQueue(room) {
  if (!room?.mediaQueue) return;

  room.mediaQueue = [...room.mediaQueue].sort((a, b) => {
    const voteDiff = Number(b.votes || 0) - Number(a.votes || 0);
    if (voteDiff !== 0) return voteDiff;
    return Number(a.addedAt || 0) - Number(b.addedAt || 0);
  });
}

function serializeMediaQueueItem(item) {
  if (!item) return item;

  return {
    ...item,
    votes: Number(item.votes || 0),
    voters: Array.isArray(item.voters) ? item.voters : [],
  };
}

function emitMediaQueue(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  sortMediaQueue(room);

  io.to(roomCode).emit("media-queue-updated", {
    currentMedia: room.currentMedia || null,
    queue: (room.mediaQueue || []).map(serializeMediaQueueItem),
  });
}

function buildRoomSnapshot(roomCode) {
  const room = rooms[roomCode];

  if (!room) return null;

  return {
    roomCode,
    host: room.host,
    users: room.users || [],
    videoUrl: room.videoUrl || "",
    videoState: getSyncedVideoState(room),
    currentMedia: room.currentMedia || null,
    mediaQueue: room.mediaQueue || [],
    roomSummary: getRoomSummary(roomCode),
    settings: getPublicRoomSettings(roomCode),
    theme: getPublicRoomTheme(roomCode),
    discoveryRoom: serializeDiscoveryRoom(roomCode),
  };
}

function emitRoomSnapshot(socket, roomCode, reason = "snapshot") {
  const snapshot = buildRoomSnapshot(roomCode);

  if (!snapshot) {
    socket.emit("room-error", "Oda bulunamadı");
    return;
  }

  socket.emit("room-snapshot", {
    ...snapshot,
    reason,
  });

  if (snapshot.videoUrl) {
    socket.emit("video-updated", snapshot.videoUrl);
    socket.emit("video-sync", {
      ...snapshot.videoState,
      reason,
    });
  }

  socket.emit("media-queue-updated", {
    currentMedia: snapshot.currentMedia,
    queue: snapshot.mediaQueue,
  });

  socket.emit("room-settings-updated", {
    roomCode,
    settings: snapshot.settings,
  });

  socket.emit("room-theme-updated", {
    roomCode,
    theme: snapshot.theme || getDefaultRoomTheme(),
    reason,
  });

  emitVoiceUsers(roomCode, socket);
}

function setRoomMedia(roomCode, mediaItem) {
  const room = rooms[roomCode];
  if (!room || !mediaItem) return;

  room.currentMedia = mediaItem;
  room.videoUrl = mediaItem.url;
  const now = Date.now();

  room.videoState = {
    isPlaying: true,
    currentTime: 0,
    updatedAt: now,
    version: now,
    hostId: room.host,
  };

  io.to(roomCode).emit("video-updated", mediaItem.url);
  // Vory 5.4.7G: Tek playback kaynağı video-sync.
  // Ek video-control play emit'i eski iframe ile yeni iframe'i aynı anda tetikleyip
  // arkadan ikinci ses çıkmasına sebep olabiliyordu.
  io.to(roomCode).emit("video-sync", {
    ...room.videoState,
    reason: "auto-play-new-media",
  });
  io.to(roomCode).emit("media-current-updated", mediaItem);
  emitMediaQueue(roomCode);
}


function removeUserFromRooms(socketId) {
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const leavingUser = room.users.find((user) => user.id === socketId);

    if (!leavingUser) continue;

    room.users = room.users.filter((user) => user.id !== socketId);

    if (syncClients[roomCode]) {
      delete syncClients[roomCode][socketId];

      if (Object.keys(syncClients[roomCode]).length === 0) {
        delete syncClients[roomCode];
      }
    }

    if (room.host === socketId && room.users.length > 0) {
      const previousHost = leavingUser;
      const newHost = room.users[0];

      room.host = newHost.id;

      room.users = room.users.map((user) => ({
        ...user,
        isHost: user.id === room.host,
      }));

      room.videoState = {
        ...(room.videoState || {}),
        hostId: room.host,
        version: Date.now(),
        updatedAt: room.videoState?.updatedAt || Date.now(),
      };

      const hostTransferPayload = {
        roomCode,
        previousHostId: previousHost.id,
        previousHostUsername: previousHost.username || "Eski host",
        newHostId: newHost.id,
        newHostUsername: newHost.username || "Yeni host",
        createdAt: Date.now(),
        videoState: getSyncedVideoState(room),
        currentMedia: room.currentMedia || null,
      };

      io.to(roomCode).emit("room-host-changed", hostTransferPayload);

      io.to(roomCode).emit(
        "system-message",
        `${hostTransferPayload.previousHostUsername} ayrıldı. ${hostTransferPayload.newHostUsername} yeni host oldu.`
      );

      emitNotification(roomCode, {
        type: "host",
        title: "Yeni host",
        message: `${hostTransferPayload.newHostUsername} yeni host oldu.`,
      });

      emitActivity(roomCode, {
        type: "host",
        title: "Host Transfer",
        username: hostTransferPayload.newHostUsername,
        message: `${hostTransferPayload.newHostUsername} yeni host oldu.`,
      });

      const snapshot = buildRoomSnapshot(roomCode);
      if (snapshot) {
        io.to(roomCode).emit("room-snapshot", {
          ...snapshot,
          reason: "host-transfer",
        });
      }
    }

    io.to(roomCode).emit(
      "system-message",
      `${leavingUser.username} odadan ayrıldı.`
    );

    emitNotification(roomCode, {
      type: "room",
      title: "Odadan ayrıldı",
      message: `${leavingUser.username} odadan ayrıldı.`,
    });

    io.to(roomCode).emit("room-users", room.users);

    if (room.users.length === 0) {
      clearPublicEmptyTimer(roomCode);
      delete rooms[roomCode];
      console.log(`Boş oda silindi: ${roomCode}`);
    }
  }

  emitDiscoveryRooms();
}

io.on("connection", (socket) => {
  console.log("Yeni kullanıcı bağlandı:", socket.id);

  socket.on("user-online", async ({ userId, username, avatar }) => {
    if (!userId) return;

    const cleanUserId = String(userId);
    const now = Date.now();

    // Vory 5.5.3E: Aynı browser/socket içinde hesap değişince eski hesap online kalmasın.
    for (const [storedUserId, storedUser] of onlineUsers.entries()) {
      if (storedUserId !== cleanUserId && storedUser?.socketId === socket.id) {
        onlineUsers.set(storedUserId, {
          ...storedUser,
          socketId: "",
          connected: false,
          isOnline: false,
          status: "offline",
          activity: "offline",
          voiceActive: false,
          roomCode: "",
          roomSummary: null,
          lastSeenAt: now,
          updatedAt: now,
        });
      }
    }

    backgroundSockets.delete(socket.id);

    const existing = onlineUsers.get(cleanUserId) || {};

    if (existing?.socketId && existing.socketId !== socket.id && existing.connected !== false) {
      io.to(existing.socketId).emit("auth-duplicate-login", {
        message: "Hesabınıza başka bir yerden giriş yapıldı.",
        userId: cleanUserId,
        at: now,
      });
    }

    onlineUsers.set(cleanUserId, {
      ...existing,
      socketId: socket.id,
      userId: cleanUserId,
      username: username || existing.username || "Kullanıcı",
      avatar: avatar || existing.avatar || "",
      status: getPresenceStatusFromActivity(existing.activity || "online"),
      roomCode: existing.roomCode || "",
      roomSummary: existing.roomSummary || null,
      activity: existing.activity || "online",
      voiceActive: !!existing.voiceActive,
      connected: true,
      isOnline: true,
      lastActiveAt: Date.now(),
      lastSeenAt: Date.now(),
      updatedAt: Date.now(),
    });

    emitPresence();

    try {
      await emitDMInboxSummary(socket, userId);
    } catch (error) {
      console.error("DM inbox summary gönderilemedi:", error);
    }
  });

  socket.on("user-logout", ({ userId } = {}) => {
    const cleanUserId = String(userId || "");
    const now = Date.now();

    for (const [storedUserId, storedUser] of onlineUsers.entries()) {
      const sameUser = cleanUserId && storedUserId === cleanUserId;
      const sameSocket = storedUser?.socketId === socket.id;

      if (sameUser || sameSocket) {
        onlineUsers.set(storedUserId, {
          ...storedUser,
          socketId: "",
          connected: false,
          isOnline: false,
          status: "offline",
          activity: "offline",
          voiceActive: false,
          roomCode: "",
          roomSummary: null,
          lastSeenAt: now,
          updatedAt: now,
        });
      }
    }

    // Explicit logout is a real logout; do not preserve background session here.
    backgroundSockets.delete(socket.id);

    emitPresence();
    emitDiscoveryRooms();
  });

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.values()));
    socket.emit("presence-changed", Array.from(onlineUsers.values()));
  });

  socket.on("get-discovery-rooms", () => {
    emitDiscoveryRooms(socket);
  });

  socket.on("request-room-snapshot", ({ roomCode }) => {
    const targetRoomCode = normalizeRoomCode(roomCode);

    if (!targetRoomCode || !rooms[targetRoomCode]) {
      socket.emit("room-error", "Oda bulunamadı");
      return;
    }

    emitRoomSnapshot(socket, targetRoomCode, "manual-snapshot");
  });

  socket.on("request-sync", ({ roomCode }) => {
    if (!roomCode || !rooms[roomCode]) return;

    emitRoomSnapshot(socket, roomCode, "sync-recovery");
  });

  socket.on("rejoin-session", ({ roomCode, username, avatar }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit("restore-failed", {
        reason: "room-not-found",
        message: "Önceki oda artık bulunamadı.",
      });
      return;
    }

    socket.join(roomCode);

    const existingIndex = room.users.findIndex((user) => user.username === username);
    const alreadyInRoom = room.users.some((user) => user.id === socket.id);

    if (!alreadyInRoom) {
      if (existingIndex >= 0) {
        room.users[existingIndex] = {
          ...room.users[existingIndex],
          id: socket.id,
          avatar: avatar || room.users[existingIndex].avatar || "",
        };
      } else {
        room.users.push({
          id: socket.id,
          username: username || "Misafir",
          avatar: avatar || "",
          isHost: false,
        });
      }
    }

    if (!room.host || !room.users.some((user) => user.id === room.host)) {
      room.host = room.users[0]?.id || socket.id;
    }

    room.users = room.users.map((user) => ({
      ...user,
      isHost: user.id === room.host,
    }));

    updateRoomPresence(socket.id, roomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      voiceActive: false,
    });

    emitPresence();

    socket.emit("room-joined", {
      roomCode,
      isHost: room.host === socket.id,
      restored: true,
    });

    io.to(roomCode).emit("room-users", room.users);
    emitRoomSnapshot(socket, roomCode, "session-restore");

    socket.to(roomCode).emit("system-message", `${username || "Misafir"} yeniden bağlandı.`);
  });


  socket.on("user-background", ({ userId, roomCode }) => {
    const cleanRoomCode = normalizeRoomCode(roomCode);
    const cleanUserId = String(userId || "");
    backgroundSockets.set(socket.id, {
      userId: cleanUserId,
      roomCode: cleanRoomCode,
      at: Date.now(),
    });

    if (cleanRoomCode && rooms[cleanRoomCode]) {
      updateRoomPresence(socket.id, cleanRoomCode, {
        activity: rooms[cleanRoomCode]?.videoUrl ? "watching" : "in-room",
        status: "online",
        lastActiveAt: Date.now(),
      });
      emitVoiceUsers(cleanRoomCode);
      emitPresence();
    }
  });

  socket.on("vory-client-keepalive", ({ roomCode, voiceWanted } = {}) => {
    const cleanRoomCode = normalizeRoomCode(roomCode);
    if (!cleanRoomCode || !rooms[cleanRoomCode]) return;

    backgroundSockets.set(socket.id, {
      userId: getOnlineUserBySocketId(socket.id)?.userId || "",
      roomCode: cleanRoomCode,
      at: Date.now(),
      voiceWanted: !!voiceWanted,
    });

    updateRoomPresence(socket.id, cleanRoomCode, {
      activity: rooms[cleanRoomCode]?.videoUrl ? "watching" : "in-room",
      status: "online",
      lastActiveAt: Date.now(),
    });

    if (voiceWanted && voiceRooms[cleanRoomCode]?.[socket.id]) {
      voiceRooms[cleanRoomCode][socket.id].lastActiveAt = Date.now();
    }

    emitVoiceUsers(cleanRoomCode);
    emitPresence();
  });

  socket.on("media-background-keepalive", ({ roomCode, voiceWanted } = {}) => {
    const cleanRoomCode = normalizeRoomCode(roomCode);
    if (!cleanRoomCode || !rooms[cleanRoomCode]) return;

    backgroundSockets.set(socket.id, {
      userId: getOnlineUserBySocketId(socket.id)?.userId || "",
      roomCode: cleanRoomCode,
      at: Date.now(),
      voiceWanted: !!voiceWanted,
    });

    updateRoomPresence(socket.id, cleanRoomCode, {
      activity: rooms[cleanRoomCode]?.videoUrl ? "watching" : "in-room",
      status: "online",
      voiceActive: !!voiceRooms[cleanRoomCode]?.[socket.id] || !!voiceWanted,
      lastActiveAt: Date.now(),
    });

    emitPresence();
  });
  socket.on("create-room", (user) => {
    const username = typeof user === "object" ? user.username : user;
    const avatar = typeof user === "object" ? user.avatar : "";
    const requestedSettings = typeof user === "object" ? user.settings || {} : {};
    const requestedPublicRoom =
      typeof requestedSettings.publicRoom === "boolean"
        ? requestedSettings.publicRoom
        : true;

    const initialMediaPayload = typeof user === "object" ? user.initialMedia || null : null;
    const initialMedia = normalizeMediaItem({
      videoUrl: initialMediaPayload?.videoUrl || initialMediaPayload?.url || "",
      title: initialMediaPayload?.title || "",
      thumbnail: initialMediaPayload?.thumbnail || "",
      channelTitle: initialMediaPayload?.channelTitle || "YouTube",
      addedBy: username || "Host",
    });

    if (!initialMedia && !user?.allowEmptyRoom) {
      socket.emit("room-error", "Önce YouTube videosu seç. Oda video seçilince oluşturulur.");
      return;
    }

    const roomCode = createRoomCode();
    const now = Date.now();

    rooms[roomCode] = {
      host: socket.id,
      videoUrl: initialMedia?.url || "",
      videoState: initialMedia
        ? {
            isPlaying: true,
            currentTime: 0,
            updatedAt: now,
            version: now,
            hostId: socket.id,
          }
        : {
            isPlaying: false,
            currentTime: 0,
            updatedAt: now,
          },
      mediaQueue: [],
      currentMedia: initialMedia || null,
      invitedSocketIds: [],
      invitedUserIds: [],
      theme: getDefaultRoomTheme(),
      settings: {
        ...getDefaultRoomSettings(),
        roomLocked: !!requestedSettings.roomLocked,
        inviteOnly: !!requestedSettings.inviteOnly,
        publicRoom: !!requestedSettings.roomLocked ? false : requestedPublicRoom,
      },
      emptyAt: null,
      users: [
        {
          id: socket.id,
          username: username || "Misafir",
          avatar: avatar || "",
          isHost: true,
        },
      ],
    };

    socket.join(roomCode);

    socket.emit("room-created", {
      roomCode,
      isHost: true,
      settings: rooms[roomCode].settings,
      theme: rooms[roomCode].theme,
      videoUrl: rooms[roomCode].videoUrl || "",
      currentMedia: rooms[roomCode].currentMedia || null,
      mediaQueue: rooms[roomCode].mediaQueue || [],
    });

    if (rooms[roomCode].currentMedia) {
      socket.emit("video-updated", rooms[roomCode].videoUrl);
      socket.emit("video-sync", {
        ...rooms[roomCode].videoState,
        reason: "room-created-with-media",
      });
      socket.emit("media-current-updated", rooms[roomCode].currentMedia);
    }

    socket.emit("room-users", rooms[roomCode].users);
    emitVoiceUsers(roomCode, socket);

    updateRoomPresence(socket.id, roomCode, {
      activity: "in-room",
      voiceActive: false,
    });

    emitPresence();

    io.to(roomCode).emit(
      "system-message",
      `${username || "Misafir"} odayı oluşturdu.`
    );

    emitNotification(roomCode, {
      type: "room",
      title: "Oda oluşturuldu",
      message: `${username || "Misafir"} yeni bir oda oluşturdu.`,
    });

    emitActivity(roomCode, {
      type: "room",
      title: "Oda oluşturuldu",
      username: username || "Misafir",
      message: `${username || "Misafir"} odayı oluşturdu.`,
    });

    emitDiscoveryRooms();
  });

  socket.on("join-room", ({ roomCode, username, avatar, restore = false }) => {
    const isRestoreJoin = !!restore;
    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];

    if (!room) {
      socket.emit("room-error", "Oda bulunamadı");
      return;
    }

    const roomSettings = room.settings || getDefaultRoomSettings();

    if (roomSettings.roomLocked || roomSettings.inviteOnly) {
      const alreadyInRoom = room.users.some((user) => user.id === socket.id);
      const isRoomHost = room.host === socket.id;

      const targetPresence = getOnlineUserBySocketId(socket.id) || {};
      const targetUserId = String(targetPresence.userId || "");
      const invitedSocketIds = new Set((room.invitedSocketIds || []).map((id) => String(id || "")));
      const invitedUserIds = new Set((room.invitedUserIds || []).map((id) => String(id || "")));
      const isInvited =
        invitedSocketIds.has(String(socket.id || "")) ||
        (targetUserId && invitedUserIds.has(targetUserId));

      if (!alreadyInRoom && !isRoomHost) {
        if (roomSettings.roomLocked) {
          socket.emit("room-error", "Bu oda gizli. Host görünür yapınca katılabilirsin.");
          return;
        }

        if (roomSettings.inviteOnly && !isInvited) {
          socket.emit("room-error", "Bu oda invite only modunda.");
          return;
        }
      }
    }

    socket.join(targetRoomCode);
    clearPublicEmptyTimer(targetRoomCode);

    const existingIndex = room.users.findIndex((user) => user.id === socket.id);
    const wasAlreadyInRoom = existingIndex >= 0;

    if (existingIndex >= 0) {
      room.users[existingIndex] = {
        ...room.users[existingIndex],
        username: username || room.users[existingIndex].username || "Misafir",
        avatar: avatar || room.users[existingIndex].avatar || "",
      };
    } else {
      room.users.push({
        id: socket.id,
        username: username || "Misafir",
        avatar: avatar || "",
        isHost: false,
      });
    }

    if (!room.host || !room.users.some((user) => user.id === room.host)) {
      room.host = room.users[0]?.id || socket.id;
    }

    room.users = room.users.map((user) => ({
      ...user,
      isHost: user.id === room.host,
    }));

    socket.emit("room-joined", {
      roomCode: targetRoomCode,
      isHost: room.host === socket.id,
      settings: room.settings || getDefaultRoomSettings(),
      theme: room.theme || getDefaultRoomTheme(),
      restore: isRestoreJoin || wasAlreadyInRoom,
      silent: isRestoreJoin || wasAlreadyInRoom,
    });

    io.to(targetRoomCode).emit("room-users", room.users);
    emitVoiceUsers(targetRoomCode, socket);

    updateRoomPresence(socket.id, targetRoomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      voiceActive: false,
    });

    emitPresence();

    // Vory 5.5.3E.11.2:
    // PC tab restore / mobile background restore re-emits join-room with restore:true.
    // Restore joins must refresh state only; they must not replay join chat lines or popup notifications.
    if (!isRestoreJoin && !wasAlreadyInRoom) {
      io.to(targetRoomCode).emit(
        "system-message",
        `${username || "Misafir"} odaya katıldı.`
      );

      emitNotification(targetRoomCode, {
        type: "room",
        title: "Odaya katıldı",
        message: `${username || "Misafir"} odaya katıldı.`,
      });

      emitActivity(targetRoomCode, {
        type: "room",
        title: "Odaya Katıldı",
        username: username || "Misafir",
        message: `${username || "Misafir"} odaya katıldı.`,
      });
    }

    if (room.videoUrl) {
      socket.emit("video-updated", room.videoUrl);
      const joinSyncState = getSyncedVideoState(room);
      socket.emit("video-sync", {
        ...joinSyncState,
        isPlaying: true,
        reason: "join-room-instant-start",
      });
      setTimeout(() => {
        if (!rooms[targetRoomCode]) return;
        socket.emit("video-sync", {
          ...getSyncedVideoState(rooms[targetRoomCode]),
          isPlaying: true,
          reason: "join-room-second-pass",
        });
      }, 700);
      setTimeout(() => {
        if (!rooms[targetRoomCode]) return;
        socket.emit("video-sync", {
          ...getSyncedVideoState(rooms[targetRoomCode]),
          isPlaying: true,
          reason: "join-room-final-pass",
        });
      }, 1200);
      setTimeout(() => {
        if (!rooms[targetRoomCode]) return;
        socket.emit("video-sync", {
          ...getSyncedVideoState(rooms[targetRoomCode]),
          isPlaying: true,
          reason: "join-room-ultra-pass",
        });
      }, 2200);
      setTimeout(() => {
        if (!rooms[targetRoomCode]) return;
        socket.emit("video-sync", {
          ...getSyncedVideoState(rooms[targetRoomCode]),
          isPlaying: true,
          reason: "join-room-hyper-pass",
        });
      }, 3600);
      setTimeout(() => {
        if (!rooms[targetRoomCode]) return;
        socket.emit("video-sync", {
          ...getSyncedVideoState(rooms[targetRoomCode]),
          isPlaying: true,
          reason: "join-room-lock-pass",
        });
      }, 5200);
    }

    socket.emit("media-queue-updated", {
      currentMedia: room.currentMedia || null,
      queue: room.mediaQueue || [],
    });

    emitRoomSnapshot(socket, targetRoomCode, "join-room");
    emitDiscoveryRooms();
  });

  socket.on("leave-room", ({ roomCode }) => {
    socket.leave(roomCode);
    removeUserFromRooms(socket.id);
    clearSocketRoomPresence(socket.id);
    emitPresence();
    emitDiscoveryRooms();
    socket.emit("room-left");
  });

  socket.on("set-video", ({ roomCode, videoUrl, title, thumbnail, channelTitle }) => {
    const room = rooms[roomCode];

    if (!room) return;

    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sadece host video değiştirebilir.");
      return;
    }

    const mediaItem = normalizeMediaItem({
      videoUrl,
      title,
      thumbnail,
      channelTitle,
      addedBy: room.users.find((user) => user.id === socket.id)?.username || "Host",
    });

    if (!mediaItem) {
      socket.emit("room-error", "Geçerli bir video linki gir.");
      return;
    }

    setRoomMedia(roomCode, mediaItem);

    room.users.forEach((user) => {
      updateRoomPresence(user.id, roomCode, {
        activity: "watching",
      });
    });

    emitPresence();

    io.to(roomCode).emit("system-message", "Host yeni medya ekledi.");

    emitNotification(roomCode, {
      type: "video",
      title: "Medya değişti",
      message: `Host ${mediaItem.type === "direct-video" ? "MP4/direct video" : "video"} başlattı.`,
    });

    emitActivity(roomCode, {
      type: "video",
      title: "Video başladı",
      username: room.users.find((user) => user.id === socket.id)?.username || "Host",
      message: `Host ${mediaItem.type === "direct-video" ? "MP4/direct video" : "video"} başlattı.`,
    });

    emitDiscoveryRooms();
  });

  socket.on("media-add-to-queue", ({ roomCode, videoUrl, title, thumbnail, channelTitle }) => {
    const room = rooms[roomCode];

    if (!room) return;

    const user = room.users.find((roomUser) => roomUser.id === socket.id);

    if (!user) {
      socket.emit("room-error", "Önce odaya gir.");
      return;
    }

    const mediaItem = normalizeMediaItem({
      videoUrl,
      title,
      thumbnail,
      channelTitle,
      addedBy: user.username || "Kullanıcı",
    });

    if (!mediaItem) {
      socket.emit("room-error", "Geçerli bir medya linki gir.");
      return;
    }

    if (!room.currentMedia && isHost(roomCode, socket.id)) {
      setRoomMedia(roomCode, mediaItem);
    } else {
      room.mediaQueue.push(mediaItem);
      emitMediaQueue(roomCode);
    }

    emitNotification(roomCode, {
      type: "video",
      title: "Sıraya eklendi",
      message: `${user.username || "Kullanıcı"} sıraya medya ekledi.`,
    });
  });

  socket.on("media-remove-from-queue", ({ roomCode, mediaId }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sıradan sadece host kaldırabilir.");
      return;
    }

    room.mediaQueue = (room.mediaQueue || []).filter((item) => item.id !== mediaId);
    emitMediaQueue(roomCode);
  });

  socket.on("media-vote", ({ roomCode, mediaId, userId, username }, ack) => {
    const reply = (payload) => {
      if (typeof ack === "function") ack(payload);
    };

    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];

    if (!room || !mediaId) {
      reply({ ok: false, message: "Oy verilecek medya bulunamadı." });
      return;
    }

    const voterId = String(userId || socket.id || "");
    const media = (room.mediaQueue || []).find((item) => item.id === mediaId);

    if (!media) {
      reply({ ok: false, message: "Bu medya artık sırada yok." });
      return;
    }

    media.voters = Array.isArray(media.voters) ? media.voters : [];

    const alreadyVoted = media.voters.includes(voterId);

    if (alreadyVoted) {
      media.voters = media.voters.filter((id) => id !== voterId);
    } else {
      media.voters.push(voterId);
    }

    media.votes = media.voters.length;
    sortMediaQueue(room);
    emitMediaQueue(targetRoomCode);

    emitActivity(targetRoomCode, {
      type: "video",
      title: alreadyVoted ? "Queue vote kaldırıldı" : "Queue vote",
      username: username || "Kullanıcı",
      message: `${username || "Kullanıcı"} ${media.title || "medya"} için ${alreadyVoted ? "oyunu kaldırdı" : "oy verdi"}.`,
    });

    reply({
      ok: true,
      voted: !alreadyVoted,
      votes: media.votes,
    });
  });

  socket.on("media-play-next", ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sıradaki medyaya sadece host geçebilir.");
      return;
    }

    const nextMedia = room.mediaQueue.shift();

    if (!nextMedia) {
      socket.emit("room-error", "Sırada medya yok.");

      emitNotification(roomCode, {
        type: "video",
        title: "Playlist tamamlandı",
        message: "Sıradaki medya bulunamadı.",
      });

      emitActivity(roomCode, {
        type: "video",
        title: "Playlist tamamlandı",
        message: "Sıradaki medya bulunamadı.",
        username: "VoryApp",
      });

      socket.emit("media-queue-empty", { roomCode });
      emitMediaQueue(roomCode);
      return;
    }

    setRoomMedia(roomCode, nextMedia);

    emitNotification(roomCode, {
      type: "video",
      title: "Sıradaki medya",
      message: "Host sıradaki medyaya geçti.",
    });
  });

  socket.on("media-clear-queue", ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sırayı sadece host temizleyebilir.");
      return;
    }

    room.mediaQueue = [];
    emitMediaQueue(roomCode);
  });

  socket.on("video-control", ({ roomCode, action, currentTime }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    const safeTime = Math.max(0, Number(currentTime) || 0);

    room.videoState = {
      isPlaying: action === "play",
      currentTime: safeTime,
      updatedAt: Date.now(),
      version: Date.now(),
      hostId: socket.id,
    };

    io.to(roomCode).emit("video-control", {
      action,
      currentTime: safeTime,
      serverTime: Date.now(),
      version: room.videoState.version,
    });
  });

  socket.on("video-seek", ({ roomCode, currentTime }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    const safeTime = Math.max(0, Number(currentTime) || 0);

    room.videoState = {
      ...(room.videoState || {}),
      currentTime: safeTime,
      updatedAt: Date.now(),
      version: Date.now(),
      hostId: socket.id,
    };

    io.to(roomCode).emit("video-seek", {
      currentTime: safeTime,
      serverTime: Date.now(),
      version: room.videoState.version,
    });
  });

  socket.on("video-heartbeat", ({ roomCode, currentTime, isPlaying, watchTitle }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    const now = Date.now();
    const limiterKey = `${roomCode}:${socket.id}`;
    const lastHeartbeat = syncHeartbeatLimiter[limiterKey] || 0;

    if (now - lastHeartbeat < SYNC_HEARTBEAT_MIN_MS) return;
    syncHeartbeatLimiter[limiterKey] = now;

    const safeTime = Math.max(0, Number(currentTime) || 0);

    room.videoState = {
      currentTime: safeTime,
      isPlaying: !!isPlaying,
      updatedAt: now,
      version: now,
      hostId: socket.id,
    };

    updateRoomPresence(socket.id, roomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      watchTitle: String(watchTitle || room.currentMedia?.title || room.videoUrl || "").slice(0, 120),
      watchTime: safeTime,
      watchingUpdatedAt: now,
    });

    emitPresence();

    socket.to(roomCode).emit("video-sync-pulse", getSyncedVideoState(room));
  });

  socket.on("client-sync-state", ({ roomCode, currentTime, isPlaying, watchTitle, voiceActive }) => {
    const room = rooms[roomCode];

    if (!room || !rooms[roomCode]?.users?.some((user) => user.id === socket.id)) return;

    const targetState = getSyncedVideoState(room);
    const safeTime = Math.max(0, Number(currentTime) || 0);
    const drift = Math.abs(safeTime - (targetState.currentTime || 0));

    updateRoomPresence(socket.id, roomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      watchTitle: String(watchTitle || room.currentMedia?.title || room.videoUrl || "").slice(0, 120),
      watchTime: safeTime,
      watchingUpdatedAt: Date.now(),
    });

    emitPresence();

    if (!syncClients[roomCode]) syncClients[roomCode] = {};

    syncClients[roomCode][socket.id] = {
      socketId: socket.id,
      currentTime: safeTime,
      isPlaying: !!isPlaying,
      drift,
      updatedAt: Date.now(),
    };

    const playStateMismatch = !!isPlaying !== !!targetState.isPlaying;
    const voiceTransitionPause = !!voiceActive && targetState.isPlaying && !isPlaying;
    const tinyPlayMismatch =
      playStateMismatch &&
      targetState.isPlaying &&
      !isPlaying &&
      drift < SYNC_HARD_DRIFT_SECONDS + 1.25;
    const shouldHardResync =
      drift >= SYNC_HARD_DRIFT_SECONDS ||
      (playStateMismatch && !voiceTransitionPause && !tinyPlayMismatch);
    const shouldSoftResync = drift >= (voiceActive ? Math.max(SYNC_DRIFT_WARN_SECONDS, 5.25) : SYNC_DRIFT_WARN_SECONDS);

    // Voice chat aktifken client state eventleri sık gelir. Aynı kullanıcıya arka arkaya
    // sync yollamak YouTube player'da 1 sn oynayıp donma döngüsü oluşturuyordu.
    if ((shouldHardResync || shouldSoftResync) && !shouldEmitSyncResponse(roomCode, socket.id)) {
      return;
    }

    if (shouldHardResync) {
      socket.emit("video-sync", {
        ...targetState,
        drift,
        reason: playStateMismatch ? "play-state-resync" : "hard-resync",
      });
      return;
    }

    if (shouldSoftResync) {
      socket.emit("video-soft-sync", {
        ...targetState,
        drift,
        reason: "soft-resync",
      });
    }
  });

  socket.on("force-video-sync", ({ roomCode, reason = "recovery" }) => {
    const room = rooms[roomCode];

    if (!room) return;

    // İlk girişte hard sync, arka plan recovery'de soft sync.
    // Böylece voice'a gir/çık sırasında player sürekli seek yemiyor.
    const hardReasons = new Set(["manual-hard"]);
    const eventName = hardReasons.has(reason) ? "video-sync" : "video-soft-sync";

    if (!shouldEmitSyncResponse(roomCode, socket.id, eventName === "video-sync" ? 2200 : SYNC_RESPONSE_MIN_MS)) {
      return;
    }

    socket.emit(eventName, {
      ...getSyncedVideoState(room),
      reason: eventName === "video-sync" ? reason : (reason === "auto-stabilizer" ? "auto-stabilizer" : "soft-recovery"),
    });
  });

  socket.on("get-sync-stats", ({ roomCode }) => {
    if (!roomCode || !syncClients[roomCode]) {
      socket.emit("sync-stats", { roomCode, clients: [] });
      return;
    }

    socket.emit("sync-stats", {
      roomCode,
      clients: Object.values(syncClients[roomCode]),
    });
  });


  socket.on("get-voice-users", ({ roomCode }) => {
    const cleanRoomCode = normalizeRoomCode(roomCode);
    if (!cleanRoomCode || !rooms[cleanRoomCode]) {
      socket.emit("voice-users", { roomCode: cleanRoomCode, users: [] });
      return;
    }

    emitVoiceUsers(cleanRoomCode, socket);
  });

  socket.on("voice-listen", ({ roomCode }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode || !rooms[roomCode]) return;

    const forcedMutedByHost = !!(rooms[roomCode]?.settings?.muteAll && !isHost(roomCode, socket.id));

    const voiceRoomName = `voice-${roomCode}`;
    socket.join(voiceRoomName);

    if (!voiceListeners[roomCode]) voiceListeners[roomCode] = new Set();
    voiceListeners[roomCode].add(socket.id);

    socket.emit("voice-peers", {
      peers: Object.keys(voiceRooms[roomCode] || {}),
    });

    emitVoiceUsers(roomCode);
  });

  socket.on("voice-unlisten", ({ roomCode }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode) return;

    voiceListeners[roomCode]?.delete(socket.id);
    if (voiceListeners[roomCode] && voiceListeners[roomCode].size === 0) delete voiceListeners[roomCode];
  });

  socket.on("voice-background-keepalive", ({ roomCode, username } = {}) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode || !rooms[roomCode]) return;

    backgroundSockets.set(socket.id, {
      userId: getOnlineUserBySocketId(socket.id)?.userId || "",
      roomCode,
      at: Date.now(),
      voiceWanted: true,
    });

    if (voiceRooms[roomCode]?.[socket.id]) {
      voiceRooms[roomCode][socket.id].username = username || voiceRooms[roomCode][socket.id].username || "Kullanıcı";
      emitVoiceUsers(roomCode);
    }
  });

  socket.on("voice-join", ({ roomCode, username }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode || !rooms[roomCode]) return;

    const graceKey = `${roomCode}:${socket.id}`;
    if (backgroundVoiceGraceTimers.has(graceKey)) {
      clearTimeout(backgroundVoiceGraceTimers.get(graceKey));
      backgroundVoiceGraceTimers.delete(graceKey);
    }

    const forcedMutedByHost = !!(rooms[roomCode]?.settings?.muteAll && !isHost(roomCode, socket.id));

    const voiceRoomName = `voice-${roomCode}`;

    socket.join(voiceRoomName);

    voiceListeners[roomCode]?.delete(socket.id);
    if (!voiceRooms[roomCode]) {
      voiceRooms[roomCode] = {};
    }

    voiceRooms[roomCode][socket.id] = {
      socketId: socket.id,
      username: username || "Kullanıcı",
      muted: !!forcedMutedByHost,
      level: 0,
      forceMuted: !!forcedMutedByHost,
    };

    const peers = Object.keys(voiceRooms[roomCode]).filter((id) => id !== socket.id);

    socket.emit("voice-peers", { peers });

    emitVoiceUsers(roomCode);

    updateRoomPresence(socket.id, roomCode, {
      voiceActive: true,
      // Video oynarken activity'yi "watching" bırakıyoruz; voice state artık video sync'i tetiklemez.
      activity: rooms[roomCode]?.videoUrl ? "watching" : "voice",
    });

    emitPresence();

    socket.to(voiceRoomName).emit("voice-user-joined", {
      socketId: socket.id,
      username: username || "Kullanıcı",
    });

    // Vory 5.5.0: voice join/leave notification spam kapalı; video tarafında re-render/freeze azaltılır.

    emitActivity(roomCode, {
      type: "voice",
      title: "Voice Chat",
      username: username || "Kullanıcı",
      message: `${username || "Kullanıcı"} sesli sohbete katıldı.`,
    });
  });

  socket.on("voice-mute-state", ({ roomCode, muted, forceMuted }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode || !voiceRooms[roomCode]?.[socket.id]) return;

    voiceRooms[roomCode][socket.id].muted = !!muted;
    voiceRooms[roomCode][socket.id].forceMuted = !!forceMuted;

    emitVoiceUsers(roomCode);
  });

  socket.on("voice-level", ({ roomCode, level }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode || !voiceRooms[roomCode]?.[socket.id]) return;

    const safeLevel = Math.max(0, Math.min(100, Number(level) || 0));
    voiceRooms[roomCode][socket.id].level = safeLevel;

    const payload = {
      roomCode,
      socketId: socket.id,
      level: safeLevel,
    };

    socket.to(`voice-${roomCode}`).emit("voice-level-update", payload);
    socket.to(roomCode).emit("voice-level-update", payload);
  });

  socket.on("voice-offer", ({ target, offer }) => {
    if (!target || !offer) return;

    io.to(target).emit("voice-offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("voice-answer", ({ target, answer }) => {
    if (!target || !answer) return;

    io.to(target).emit("voice-answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("voice-ice-candidate", ({ target, candidate }) => {
    if (!target || !candidate) return;

    io.to(target).emit("voice-ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("voice-leave", ({ roomCode }) => {
    roomCode = normalizeRoomCode(roomCode);
    if (!roomCode) return;

    const voiceRoomName = `voice-${roomCode}`;

    socket.leave(voiceRoomName);

    if (voiceRooms[roomCode]) {
      delete voiceRooms[roomCode][socket.id];

      if (Object.keys(voiceRooms[roomCode]).length === 0) {
        delete voiceRooms[roomCode];
      }
    }

    socket.to(voiceRoomName).emit("voice-user-left", {
      socketId: socket.id,
    });

    const activeRoom = rooms[roomCode];
    const stillInRoom = activeRoom?.users?.some((user) => user.id === socket.id);

    updateRoomPresence(socket.id, stillInRoom ? roomCode : "", {
      voiceActive: false,
      activity: stillInRoom ? (activeRoom?.videoUrl ? "watching" : "in-room") : "idle",
    });

    emitPresence();

    emitVoiceUsers(roomCode);

    // Vory 5.5.0: voice ayrılma bildirimi sessiz; activity kalır.

    emitActivity(roomCode, {
      type: "voice",
      title: "Voice ayrıldı",
      username: "Kullanıcı",
      message: "Bir kullanıcı sesli sohbetten ayrıldı.",
    });
  });



  // Vory 3.3.1 Pure Rave: screen share socket flow removed.

  socket.on("presence-update", ({ roomCode, activity, voiceActive, watchTitle, watchTime }) => {
    const existingPresence = getOnlineUserBySocketId(socket.id) || {};
    const nextActivity = normalizePresenceActivity(activity || existingPresence.activity || "idle");

    updateRoomPresence(socket.id, roomCode || existingPresence.roomCode || "", {
      activity: nextActivity,
      voiceActive: typeof voiceActive === "boolean" ? voiceActive : !!existingPresence.voiceActive,
      watchTitle: String(watchTitle || existingPresence.watchTitle || "").slice(0, 120),
      watchTime: Math.max(0, Number(watchTime ?? existingPresence.watchTime) || 0),
      watchingUpdatedAt: Date.now(),
    });

    emitPresence();
  });

  socket.on("presence-heartbeat", ({ roomCode, activity, watchTitle, watchTime } = {}) => {
    const existingPresence = getOnlineUserBySocketId(socket.id) || {};
    const nextActivity = normalizePresenceActivity(activity || existingPresence.activity || "online");

    updateRoomPresence(socket.id, roomCode || existingPresence.roomCode || "", {
      activity: nextActivity,
      voiceActive: !!existingPresence.voiceActive,
      watchTitle: String(watchTitle || existingPresence.watchTitle || "").slice(0, 120),
      watchTime: Math.max(0, Number(watchTime ?? existingPresence.watchTime) || 0),
      watchingUpdatedAt: Date.now(),
    });

    emitPresence();
  });





  socket.on("room-theme-update", ({ roomCode, theme }) => {
    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];
    const nextTheme = String(theme || "").toLowerCase();

    if (!targetRoomCode || !room) {
      socket.emit("room-error", "Oda bulunamadı.");
      return;
    }

    if (!isHost(targetRoomCode, socket.id)) {
      socket.emit("room-error", "Room theme sadece host tarafından değiştirilebilir.");
      return;
    }

    if (!isValidRoomTheme(nextTheme)) {
      socket.emit("room-error", "Geçersiz oda teması.");
      return;
    }

    room.theme = nextTheme;

    io.to(targetRoomCode).emit("room-theme-updated", {
      roomCode: targetRoomCode,
      theme: room.theme,
      updatedAt: Date.now(),
    });

    emitDiscoveryRooms();

    emitNotification(targetRoomCode, {
      type: "room",
      title: "Room theme updated",
      message: `Host oda temasını ${room.theme} yaptı.`,
    });

    emitActivity(targetRoomCode, {
      type: "room",
      title: "Room Theme",
      username: "Host",
      message: `Oda teması ${room.theme} olarak değişti.`,
    });
  });


  socket.on("room-settings-update", ({ roomCode, settings }) => {
    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];

    if (!targetRoomCode || !room) {
      socket.emit("room-error", "Oda bulunamadı.");
      return;
    }

    if (!isHost(targetRoomCode, socket.id)) {
      socket.emit("room-error", "Room settings sadece host tarafından değiştirilebilir.");
      return;
    }

    const currentSettings = room.settings || getDefaultRoomSettings();

    const nextRoomLocked = !!settings?.roomLocked;
    const nextInviteOnly = !!settings?.inviteOnly;
    const explicitPublicRoom = typeof settings?.publicRoom === "boolean" ? !!settings.publicRoom : !!currentSettings.publicRoom;

    room.settings = {
      ...currentSettings,
      // Vory 5.5.3E.11.7:
      // roomLocked artık "odayı gizle/göster" davranışıdır.
      // publicRoom kullanıcı tercihi olarak korunur; lock açılınca discovery filtreler,
      // lock kapanınca oda publicRoom true ise otomatik geri görünür.
      roomLocked: nextRoomLocked,
      inviteOnly: nextInviteOnly,
      muteAll: typeof settings?.muteAll === "boolean" ? !!settings.muteAll : !!currentSettings.muteAll,
      chatLocked: typeof settings?.chatLocked === "boolean" ? !!settings.chatLocked : !!currentSettings.chatLocked,
      publicRoom: explicitPublicRoom,
    };

    if ((room.users || []).length === 0) {
      clearPublicEmptyTimer(targetRoomCode);
      delete rooms[targetRoomCode];
      emitDiscoveryRooms();
      return;
    }

    io.to(targetRoomCode).emit("room-settings-updated", {
      roomCode: targetRoomCode,
      settings: room.settings,
      discoveryRoom: serializeDiscoveryRoom(targetRoomCode),
      updatedAt: Date.now(),
    });

    emitDiscoveryRooms();
    setTimeout(() => emitDiscoveryRooms(), 250);

    if (room.settings.muteAll) {
      io.to(targetRoomCode).emit("room-mute-all", {
        roomCode: targetRoomCode,
        muted: true,
      });
    }

    emitNotification(targetRoomCode, {
      type: "room",
      title: "Room settings updated",
      message: "Host oda ayarlarını güncelledi.",
    });
  });



  socket.on("party-invite-send", ({ targetSocketId, roomCode, fromUsername }, ack) => {
    const reply = (payload) => {
      if (typeof ack === "function") ack(payload);
    };

    const targetRoomCode = normalizeRoomCode(roomCode);

    if (!targetSocketId || !targetRoomCode) {
      reply({ ok: false, message: "Davet gönderilemedi." });
      return;
    }

    const room = rooms[targetRoomCode];

    if (!room) {
      reply({ ok: false, message: "Davet gönderilecek oda bulunamadı." });
      return;
    }

    if (targetSocketId === socket.id) {
      reply({ ok: false, message: "Kendine davet gönderemezsin." });
      return;
    }

    const targetPresence = Array.from(onlineUsers.values()).find(
      (user) => user.socketId === targetSocketId
    );

    if (!targetPresence) {
      reply({ ok: false, message: "Kullanıcı offline görünüyor." });
      return;
    }

    if (normalizeRoomCode(targetPresence.roomCode) === targetRoomCode) {
      reply({ ok: false, message: "Bu kullanıcı zaten aynı odada." });
      return;
    }

    const cooldownKey = `${socket.id}:${targetSocketId}:${targetRoomCode}`;
    const lastInviteAt = partyInviteCooldowns.get(cooldownKey) || 0;
    const elapsed = Date.now() - lastInviteAt;

    if (elapsed < PARTY_INVITE_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((PARTY_INVITE_COOLDOWN_MS - elapsed) / 1000);
      reply({
        ok: false,
        cooldown: true,
        remainingSeconds,
        message: `Çok sık davet gönderemezsin. ${remainingSeconds} sn bekle.`,
      });
      return;
    }

    partyInviteCooldowns.set(cooldownKey, Date.now());
    setTimeout(() => partyInviteCooldowns.delete(cooldownKey), PARTY_INVITE_COOLDOWN_MS + 1000);

    const targetUserId = String(targetPresence.userId || "");
    const targetSocketIdClean = String(targetSocketId || "");

    room.invitedSocketIds = Array.from(new Set([...(room.invitedSocketIds || []), targetSocketIdClean].filter(Boolean)));
    room.invitedUserIds = Array.from(new Set([...(room.invitedUserIds || []), targetUserId].filter(Boolean)));
    room.lastInviteAt = Date.now();

    const invite = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "invite",
      title: "Party Invite",
      message: `${fromUsername || "Kullanıcı"} seni odaya davet etti.`,
      fromUsername: fromUsername || "Kullanıcı",
      fromSocketId: socket.id,
      targetSocketId,
      roomCode: targetRoomCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + PARTY_INVITE_COOLDOWN_MS,
      read: false,
      action: "join-room",
    };

    io.to(targetSocketId).emit("party-invite-received", invite);
    io.to(targetSocketId).emit("notification:new", invite);

    const invitedSocket = io.sockets.sockets.get(targetSocketId);
    if (invitedSocket) {
      emitDiscoveryRooms(invitedSocket);
    }
    emitDiscoveryRooms();

    emitActivity(targetRoomCode, {
      type: "invite",
      title: "Davet gönderildi",
      message: `${fromUsername || "Kullanıcı"} bir arkadaşını odaya davet etti.`,
      username: fromUsername || "Kullanıcı",
    });

    reply({
      ok: true,
      message: "Davet gönderildi 🎉",
      cooldownMs: PARTY_INVITE_COOLDOWN_MS,
    });
  });

  socket.on("reaction:send", ({ roomCode, emoji, username }) => {
    if (!roomCode || !rooms[roomCode]) return;

    const safeEmoji = String(emoji || "").slice(0, 4);
    const safeUsername = username || "Kullanıcı";

    if (!safeEmoji) return;

    const reaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      emoji: safeEmoji,
      username: safeUsername,
      socketId: socket.id,
      roomCode,
      createdAt: Date.now(),
    };

    io.to(roomCode).emit("reaction:new", reaction);

    emitActivity(roomCode, {
      type: "reaction",
      title: "Reaction",
      message: `${safeUsername} ${safeEmoji} reaksiyon attı.`,
      username: safeUsername,
    });
  });

  socket.on("typing-start", ({ roomCode, username }) => {
    if (!roomCode || !rooms[roomCode]) return;

    socket.to(roomCode).emit("user-typing", {
      username: username || "Kullanıcı",
      socketId: socket.id,
    });
  });

  socket.on("typing-stop", ({ roomCode }) => {
    if (!roomCode || !rooms[roomCode]) return;

    socket.to(roomCode).emit("user-stop-typing", {
      socketId: socket.id,
    });
  });

  socket.on("send-message", ({ roomCode, message, username, userId, avatar }) => {
    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];

    if (!room || !message) return;

    if (room.settings?.chatLocked && !isHost(targetRoomCode, socket.id)) {
      socket.emit("room-error", "Chat kilitli. Sadece host mesaj gönderebilir.");
      return;
    }

    io.to(targetRoomCode).emit("receive-message", {
      id: `${Date.now()}-${socket.id}`,
      sender: username || "Misafir",
      userId: userId || "",
      avatar: avatar || getOnlineUserBySocketId(socket.id)?.avatar || "",
      message,
      createdAt: Date.now(),
    });
  });


  socket.on("dm:history", async ({ currentUserId, targetUserId }, ack) => {
    const reply = (payload) => {
      if (typeof ack === "function") ack(payload);
    };

    const cleanCurrentUserId = String(currentUserId || "");
    const cleanTargetUserId = String(targetUserId || "");

    if (!cleanCurrentUserId || !cleanTargetUserId) {
      reply({ ok: false, message: "DM geçmişi alınamadı." });
      return;
    }

    try {
      const readResult = await DirectMessage.updateMany(
        {
          fromUserId: cleanTargetUserId,
          toUserId: cleanCurrentUserId,
          read: false,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        }
      );

      const messages = await DirectMessage.find({
        $or: [
          { fromUserId: cleanCurrentUserId, toUserId: cleanTargetUserId },
          { fromUserId: cleanTargetUserId, toUserId: cleanCurrentUserId },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      if (Number(readResult?.modifiedCount || 0) > 0) {
        const senderPresence = getOnlineUserById(cleanTargetUserId);
        const readMessageIds = messages
          .filter((message) =>
            String(message.fromUserId || "") === cleanTargetUserId &&
            String(message.toUserId || "") === cleanCurrentUserId
          )
          .map((message) => String(message._id || message.clientId || ""));

        if (senderPresence?.socketId) {
          io.to(senderPresence.socketId).emit("dm:read", {
            readerUserId: cleanCurrentUserId,
            messageIds: readMessageIds,
            readAt: Date.now(),
          });
        }
      }

      reply({
        ok: true,
        messages: messages.map(serializeDM),
      });
    } catch (error) {
      console.error("DM history alınamadı:", error);
      reply({ ok: false, message: "DM geçmişi alınamadı." });
    }
  });

  socket.on("dm:send", async ({ fromUserId, toUserId, fromUsername, toUsername, message }, ack) => {
    const reply = (payload) => {
      if (typeof ack === "function") ack(payload);
    };

    const cleanMessage = String(message || "").trim();
    const cleanFromUserId = String(fromUserId || "");
    const cleanToUserId = String(toUserId || "");

    if (!cleanFromUserId || !cleanToUserId || !cleanMessage) {
      reply({ ok: false, message: "DM gönderilemedi." });
      return;
    }

    if (cleanFromUserId === cleanToUserId) {
      reply({ ok: false, message: "Kendine mesaj gönderemezsin." });
      return;
    }

    try {
      const savedMessage = await DirectMessage.create({
        clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromUserId: cleanFromUserId,
        toUserId: cleanToUserId,
        fromUsername: fromUsername || "Kullanıcı",
        toUsername: toUsername || "Kullanıcı",
        message: cleanMessage.slice(0, 1000),
        read: false,
      });

      const dmMessage = serializeDM(savedMessage);
      const targetPresence = getOnlineUserById(cleanToUserId);

      if (targetPresence?.socketId) {
        io.to(targetPresence.socketId).emit("dm:received", dmMessage);
        io.to(targetPresence.socketId).emit("notification:new", {
          id: `dm-${dmMessage.id}`,
          type: "dm",
          title: `DM • ${dmMessage.fromUsername}`,
          message: dmMessage.message,
          createdAt: dmMessage.createdAt,
          read: false,
          fromUserId: dmMessage.fromUserId,
          fromUsername: dmMessage.fromUsername,
        });
      }

      socket.emit("dm:sent", dmMessage);

      reply({
        ok: true,
        message: dmMessage,
        delivered: !!targetPresence?.socketId,
      });
    } catch (error) {
      console.error("DM gönderilemedi:", error);
      reply({ ok: false, message: "DM gönderilemedi." });
    }
  });

  socket.on("dm:mark-read", async ({ currentUserId, targetUserId }, ack) => {
    const reply = (payload) => {
      if (typeof ack === "function") ack(payload);
    };

    const cleanCurrentUserId = String(currentUserId || "");
    const cleanTargetUserId = String(targetUserId || "");

    if (!cleanCurrentUserId || !cleanTargetUserId) {
      reply({ ok: false, message: "DM okundu bilgisi güncellenemedi." });
      return;
    }

    try {
      const unreadMessages = await DirectMessage.find({
        fromUserId: cleanTargetUserId,
        toUserId: cleanCurrentUserId,
        read: false,
      }).select("_id clientId").lean();

      if (!unreadMessages.length) {
        reply({ ok: true, updated: 0 });
        return;
      }

      await DirectMessage.updateMany(
        {
          fromUserId: cleanTargetUserId,
          toUserId: cleanCurrentUserId,
          read: false,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        }
      );

      const senderPresence = getOnlineUserById(cleanTargetUserId);
      const readMessageIds = unreadMessages.map((message) =>
        String(message._id || message.clientId || "")
      );

      if (senderPresence?.socketId) {
        io.to(senderPresence.socketId).emit("dm:read", {
          readerUserId: cleanCurrentUserId,
          messageIds: readMessageIds,
          readAt: Date.now(),
        });
      }

      reply({
        ok: true,
        updated: readMessageIds.length,
      });
    } catch (error) {
      console.error("DM okundu bilgisi güncellenemedi:", error);
      reply({ ok: false, message: "DM okundu bilgisi güncellenemedi." });
    }
  });

  socket.on("dm:typing", ({ fromUserId, toUserId, fromUsername }) => {
    const targetPresence = getOnlineUserById(toUserId);
    if (!targetPresence?.socketId) return;

    io.to(targetPresence.socketId).emit("dm:typing", {
      fromUserId,
      fromUsername: fromUsername || "Kullanıcı",
      createdAt: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    const backgroundInfo = backgroundSockets.get(socket.id);
    const backgroundAge = backgroundInfo ? Date.now() - Number(backgroundInfo.at || 0) : Infinity;
    const preserveBackgroundSession = !!backgroundInfo && backgroundAge < 15 * 60 * 1000;

    if (!preserveBackgroundSession) {
      removeUserFromRooms(socket.id);
    }

    for (const roomName of socket.rooms) {
      if (roomName.startsWith("voice-")) {
        const roomCode = roomName.replace("voice-", "");

        if (preserveBackgroundSession && voiceRooms[roomCode]?.[socket.id]) {
          const graceKey = `${roomCode}:${socket.id}`;
          if (backgroundVoiceGraceTimers.has(graceKey)) {
            clearTimeout(backgroundVoiceGraceTimers.get(graceKey));
          }
          backgroundVoiceGraceTimers.set(graceKey, setTimeout(() => {
            if (voiceRooms[roomCode]) {
              delete voiceRooms[roomCode][socket.id];
              if (Object.keys(voiceRooms[roomCode]).length === 0) delete voiceRooms[roomCode];
            }
            voiceListeners[roomCode]?.delete(socket.id);
            if (voiceListeners[roomCode] && voiceListeners[roomCode].size === 0) delete voiceListeners[roomCode];
            io.to(roomName).emit("voice-user-left", { socketId: socket.id });
            emitVoiceUsers(roomCode);
            backgroundVoiceGraceTimers.delete(graceKey);
          }, 15 * 60 * 1000));
        } else {
          if (voiceRooms[roomCode]) {
            delete voiceRooms[roomCode][socket.id];

            if (Object.keys(voiceRooms[roomCode]).length === 0) {
              delete voiceRooms[roomCode];
            }
          }

          voiceListeners[roomCode]?.delete(socket.id);
          if (voiceListeners[roomCode] && voiceListeners[roomCode].size === 0) {
            delete voiceListeners[roomCode];
          }

          socket.to(roomName).emit("voice-user-left", {
            socketId: socket.id,
          });
          emitVoiceUsers(roomCode);
        }
      }
    }

    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        if (preserveBackgroundSession) {
          onlineUsers.set(userId, {
            ...user,
            connected: false,
            isOnline: true,
            status: "online",
            activity: user.activity || "watching",
            lastActiveAt: Date.now(),
            updatedAt: Date.now(),
          });
          continue;
        }
        const now = Date.now();
        onlineUsers.set(userId, {
          ...user,
          socketId: "",
          connected: false,
          isOnline: false,
          status: "offline",
          activity: "offline",
          voiceActive: false,
          roomCode: "",
          roomSummary: null,
          lastSeenAt: now,
          updatedAt: now,
        });
      }
    }

    emitPresence();
    emitDiscoveryRooms();
  });
});

const PORT = process.env.PORT || 5000;

connectDB();

server.listen(PORT, () => {
  console.log(`VoryApp server ${PORT} portunda çalışıyor 🚀`);
});