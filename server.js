require("dotenv").config();

const dns = require("dns");
const path = require("path");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const rooms = {};
const onlineUsers = new Map();
const voiceRooms = {};
const screenShares = {};
const partyInviteCooldowns = new Map();
const PARTY_INVITE_COOLDOWN_MS = 60 * 1000;

const SYNC_DRIFT_WARN_SECONDS = 1.5;
const SYNC_HARD_DRIFT_SECONDS = 3.5;
const SYNC_HEARTBEAT_MIN_MS = 700;

const syncClients = {};
const syncHeartbeatLimiter = {};
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

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

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


app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
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
  };
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
      screenSharing: false,
      videoActive: false,
    };
  }

  return {
    roomCode,
    userCount: room.users?.length || 0,
    voiceCount: voiceRooms[roomCode] ? Object.keys(voiceRooms[roomCode]).length : 0,
    screenSharing: !!screenShares[roomCode],
    videoActive: !!room.videoUrl,
  };
}

function updateSocketPresence(socketId, patch = {}) {
  for (const [userId, user] of onlineUsers.entries()) {
    if (user.socketId !== socketId) continue;

    onlineUsers.set(userId, {
      ...user,
      ...patch,
      updatedAt: Date.now(),
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
    screenSharing: false,
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

function normalizeMediaItem({ videoUrl, title, addedBy }) {
  const cleanUrl = String(videoUrl || "").trim();

  if (!cleanUrl) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url: cleanUrl,
    title: String(title || "").trim() || cleanUrl,
    type: detectMediaType(cleanUrl),
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
    screenShare: room.screenShare || null,
    roomSummary: getRoomSummary(roomCode),
    settings: getPublicRoomSettings(roomCode),
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

  if (snapshot.screenShare?.broadcaster) {
    socket.emit("screen-share-started", {
      broadcaster: snapshot.screenShare.broadcaster,
      username: snapshot.screenShare.username,
    });
  }
}

function setRoomMedia(roomCode, mediaItem) {
  const room = rooms[roomCode];
  if (!room || !mediaItem) return;

  room.currentMedia = mediaItem;
  room.videoUrl = mediaItem.url;
  room.videoState = {
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
    version: Date.now(),
    hostId: room.host,
  };

  io.to(roomCode).emit("video-updated", mediaItem.url);
  io.to(roomCode).emit("video-sync", room.videoState);
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
      room.host = room.users[0].id;

      room.users = room.users.map((user, index) => ({
        ...user,
        isHost: index === 0,
      }));

      io.to(roomCode).emit(
        "system-message",
        `${room.users[0].username} yeni host oldu.`
      );

      emitNotification(roomCode, {
        type: "host",
        title: "Yeni host",
        message: `${room.users[0].username} yeni host oldu.`,
      });
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
      delete rooms[roomCode];
      console.log(`Boş oda silindi: ${roomCode}`);
    }
  }
}

io.on("connection", (socket) => {
  console.log("Yeni kullanıcı bağlandı:", socket.id);

  socket.on("user-online", async ({ userId, username }) => {
    if (!userId) return;

    const existing = onlineUsers.get(String(userId)) || {};

    onlineUsers.set(String(userId), {
      ...existing,
      socketId: socket.id,
      userId: String(userId),
      username: username || existing.username || "Kullanıcı",
      status: "online",
      roomCode: existing.roomCode || "",
      roomSummary: existing.roomSummary || null,
      activity: existing.activity || "idle",
      voiceActive: !!existing.voiceActive,
      screenSharing: !!existing.screenSharing,
      updatedAt: Date.now(),
    });

    emitPresence();

    try {
      await emitDMInboxSummary(socket, userId);
    } catch (error) {
      console.error("DM inbox summary gönderilemedi:", error);
    }
  });

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.values()));
    socket.emit("presence-changed", Array.from(onlineUsers.values()));
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
      screenSharing: !!screenShares[roomCode],
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

  socket.on("create-room", (user) => {
    const username = typeof user === "object" ? user.username : user;
    const avatar = typeof user === "object" ? user.avatar : "";

    const roomCode = createRoomCode();

    rooms[roomCode] = {
      host: socket.id,
      videoUrl: "",
      videoState: {
        isPlaying: false,
        currentTime: 0,
        updatedAt: Date.now(),
      },
      screenShare: null,
      mediaQueue: [],
      currentMedia: null,
      settings: getDefaultRoomSettings(),
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
    });

    socket.emit("room-users", rooms[roomCode].users);

    updateRoomPresence(socket.id, roomCode, {
      activity: "in-room",
      voiceActive: false,
      screenSharing: false,
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
  });

  socket.on("join-room", ({ roomCode, username, avatar }) => {
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

      if (!alreadyInRoom && !isRoomHost) {
        socket.emit(
          "room-error",
          roomSettings.roomLocked
            ? "Bu oda kilitli. Host kilidi açınca katılabilirsin."
            : "Bu oda invite only modunda."
        );
        return;
      }
    }

    socket.join(targetRoomCode);

    const existingIndex = room.users.findIndex((user) => user.id === socket.id);

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

    room.users = room.users.map((user) => ({
      ...user,
      isHost: user.id === room.host,
    }));

    socket.emit("room-joined", {
      roomCode: targetRoomCode,
      isHost: room.host === socket.id,
      settings: room.settings || getDefaultRoomSettings(),
    });

    io.to(targetRoomCode).emit("room-users", room.users);

    updateRoomPresence(socket.id, targetRoomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      voiceActive: false,
      screenSharing: !!screenShares[targetRoomCode],
    });

    emitPresence();

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

    if (room.videoUrl) {
      socket.emit("video-updated", room.videoUrl);
      socket.emit("video-sync", getSyncedVideoState(room));
    }

    socket.emit("media-queue-updated", {
      currentMedia: room.currentMedia || null,
      queue: room.mediaQueue || [],
    });

    if (screenShares[targetRoomCode]) {
      socket.emit("screen-share-started", {
        broadcaster: screenShares[targetRoomCode],
      });
    }

    emitRoomSnapshot(socket, targetRoomCode, "join-room");
  });

  socket.on("leave-room", ({ roomCode }) => {
    socket.leave(roomCode);
    removeUserFromRooms(socket.id);
    clearSocketRoomPresence(socket.id);
    emitPresence();
    socket.emit("room-left");
  });

  socket.on("set-video", ({ roomCode, videoUrl, title }) => {
    const room = rooms[roomCode];

    if (!room) return;

    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sadece host video değiştirebilir.");
      return;
    }

    const mediaItem = normalizeMediaItem({
      videoUrl,
      title,
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
  });

  socket.on("media-add-to-queue", ({ roomCode, videoUrl, title }) => {
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

  socket.on("video-heartbeat", ({ roomCode, currentTime, isPlaying }) => {
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
      version: room.videoState?.version || now,
      hostId: socket.id,
    };

    socket.to(roomCode).emit("video-sync-pulse", getSyncedVideoState(room));
  });

  socket.on("client-sync-state", ({ roomCode, currentTime, isPlaying }) => {
    const room = rooms[roomCode];

    if (!room || !rooms[roomCode]?.users?.some((user) => user.id === socket.id)) return;

    const targetState = getSyncedVideoState(room);
    const safeTime = Math.max(0, Number(currentTime) || 0);
    const drift = Math.abs(safeTime - (targetState.currentTime || 0));

    if (!syncClients[roomCode]) syncClients[roomCode] = {};

    syncClients[roomCode][socket.id] = {
      socketId: socket.id,
      currentTime: safeTime,
      isPlaying: !!isPlaying,
      drift,
      updatedAt: Date.now(),
    };

    if (drift >= SYNC_HARD_DRIFT_SECONDS || !!isPlaying !== !!targetState.isPlaying) {
      socket.emit("video-sync", {
        ...targetState,
        reason: "hard-resync",
      });
      return;
    }

    if (drift >= SYNC_DRIFT_WARN_SECONDS) {
      socket.emit("video-soft-sync", {
        ...targetState,
        drift,
        reason: "soft-resync",
      });
    }
  });

  socket.on("force-video-sync", ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return;

    socket.emit("video-sync", {
      ...getSyncedVideoState(room),
      reason: "manual-sync",
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


  socket.on("voice-join", ({ roomCode, username }) => {
    if (!roomCode || !rooms[roomCode]) return;

    const voiceRoomName = `voice-${roomCode}`;

    socket.join(voiceRoomName);

    if (!voiceRooms[roomCode]) {
      voiceRooms[roomCode] = {};
    }

    voiceRooms[roomCode][socket.id] = {
      socketId: socket.id,
      username: username || "Kullanıcı",
      muted: false,
      level: 0,
    };

    const peers = Object.keys(voiceRooms[roomCode]).filter((id) => id !== socket.id);

    socket.emit("voice-peers", { peers });

    io.to(voiceRoomName).emit("voice-users", {
      users: Object.values(voiceRooms[roomCode]),
    });

    updateRoomPresence(socket.id, roomCode, {
      voiceActive: true,
      activity: "voice",
    });

    emitPresence();

    socket.to(voiceRoomName).emit("voice-user-joined", {
      socketId: socket.id,
      username: username || "Kullanıcı",
    });

    emitNotification(roomCode, {
      type: "voice",
      title: "Voice aktif",
      message: `${username || "Kullanıcı"} sesli sohbete katıldı.`,
    });

    emitActivity(roomCode, {
      type: "voice",
      title: "Voice Chat",
      username: username || "Kullanıcı",
      message: `${username || "Kullanıcı"} sesli sohbete katıldı.`,
    });
  });

  socket.on("voice-mute-state", ({ roomCode, muted }) => {
    if (!roomCode || !voiceRooms[roomCode]?.[socket.id]) return;

    voiceRooms[roomCode][socket.id].muted = !!muted;

    io.to(`voice-${roomCode}`).emit("voice-users", {
      users: Object.values(voiceRooms[roomCode]),
    });
  });

  socket.on("voice-level", ({ roomCode, level }) => {
    if (!roomCode || !voiceRooms[roomCode]?.[socket.id]) return;

    const safeLevel = Math.max(0, Math.min(100, Number(level) || 0));
    voiceRooms[roomCode][socket.id].level = safeLevel;

    socket.to(`voice-${roomCode}`).emit("voice-level-update", {
      socketId: socket.id,
      level: safeLevel,
    });
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

    io.to(voiceRoomName).emit("voice-users", {
      users: Object.values(voiceRooms[roomCode] || {}),
    });

    emitNotification(roomCode, {
      type: "voice",
      title: "Voice ayrıldı",
      message: "Bir kullanıcı sesli sohbetten ayrıldı.",
    });

    emitActivity(roomCode, {
      type: "voice",
      title: "Voice ayrıldı",
      username: "Kullanıcı",
      message: "Bir kullanıcı sesli sohbetten ayrıldı.",
    });
  });



  socket.on("screen-share-start", ({ roomCode, username }) => {
    if (!roomCode || !rooms[roomCode]) return;

    const activeBroadcaster = screenShares[roomCode];

    if (activeBroadcaster && activeBroadcaster !== socket.id) {
      socket.emit("screen-share-error", "Bu odada zaten ekran paylaşımı var.");
      return;
    }

    screenShares[roomCode] = socket.id;
    rooms[roomCode].screenShare = {
      broadcaster: socket.id,
      username: username || "Kullanıcı",
      startedAt: Date.now(),
    };

    updateRoomPresence(socket.id, roomCode, {
      activity: "sharing-screen",
      screenSharing: true,
    });

    emitPresence();

    io.to(roomCode).emit("screen-share-started", {
      broadcaster: socket.id,
      username: username || "Kullanıcı",
    });

    io.to(roomCode).emit(
      "system-message",
      `${username || "Kullanıcı"} ekran paylaşımı başlattı.`
    );

    emitNotification(roomCode, {
      type: "screen",
      title: "Ekran paylaşımı",
      message: `${username || "Kullanıcı"} ekran paylaşımı başlattı.`,
    });

    emitActivity(roomCode, {
      type: "screen",
      title: "Screen Share",
      username: username || "Kullanıcı",
      message: `${username || "Kullanıcı"} ekran paylaşımı başlattı.`,
    });
  });

  socket.on("screen-share-stop", ({ roomCode }) => {
    if (!roomCode || !rooms[roomCode]) return;
    if (screenShares[roomCode] !== socket.id) return;

    delete screenShares[roomCode];
    rooms[roomCode].screenShare = null;

    updateRoomPresence(socket.id, roomCode, {
      activity: rooms[roomCode]?.videoUrl ? "watching" : "in-room",
      screenSharing: false,
    });

    emitPresence();

    io.to(roomCode).emit("screen-share-stopped", {
      broadcaster: socket.id,
    });

    io.to(roomCode).emit("system-message", "Ekran paylaşımı durduruldu.");

    emitNotification(roomCode, {
      type: "screen",
      title: "Ekran paylaşımı durdu",
      message: "Ekran paylaşımı durduruldu.",
    });

    emitActivity(roomCode, {
      type: "screen",
      title: "Screen Share bitti",
      username: "Kullanıcı",
      message: "Ekran paylaşımı durduruldu.",
    });
  });

  socket.on("request-screen-stream", ({ roomCode }) => {
    if (!roomCode || !rooms[roomCode]) return;

    const broadcaster = screenShares[roomCode];
    if (!broadcaster || broadcaster === socket.id) return;

    io.to(broadcaster).emit("screen-viewer-joined", {
      viewer: socket.id,
    });
  });

  socket.on("screen-offer", ({ target, offer }) => {
    if (!target || !offer) return;

    io.to(target).emit("screen-offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("screen-answer", ({ target, answer }) => {
    if (!target || !answer) return;

    io.to(target).emit("screen-answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("screen-ice-candidate", ({ target, candidate }) => {
    if (!target || !candidate) return;

    io.to(target).emit("screen-ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("presence-update", ({ roomCode, activity, voiceActive, screenSharing }) => {
    updateRoomPresence(socket.id, roomCode || "", {
      activity: activity || "idle",
      voiceActive: !!voiceActive,
      screenSharing: !!screenSharing,
    });

    emitPresence();
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

    room.settings = {
      ...currentSettings,
      roomLocked: !!settings?.roomLocked,
      inviteOnly: !!settings?.inviteOnly,
      muteAll: !!settings?.muteAll,
      chatLocked: !!settings?.chatLocked,
    };

    io.to(targetRoomCode).emit("room-settings-updated", {
      roomCode: targetRoomCode,
      settings: room.settings,
    });

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
    };

    io.to(targetSocketId).emit("party-invite-received", invite);
    io.to(targetSocketId).emit("notification:new", invite);

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

  socket.on("send-message", ({ roomCode, message, username }) => {
    const targetRoomCode = normalizeRoomCode(roomCode);
    const room = rooms[targetRoomCode];

    if (!room || !message) return;

    if (room.settings?.chatLocked && !isHost(targetRoomCode, socket.id)) {
      socket.emit("room-error", "Chat kilitli. Sadece host mesaj gönderebilir.");
      return;
    }

    io.to(targetRoomCode).emit("receive-message", {
      sender: username || "Misafir",
      message,
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
    removeUserFromRooms(socket.id);

    for (const roomName of socket.rooms) {
      if (roomName.startsWith("voice-")) {
        const roomCode = roomName.replace("voice-", "");

        if (voiceRooms[roomCode]) {
          delete voiceRooms[roomCode][socket.id];

          if (Object.keys(voiceRooms[roomCode]).length === 0) {
            delete voiceRooms[roomCode];
          }
        }

        socket.to(roomName).emit("voice-user-left", {
          socketId: socket.id,
        });

        io.to(roomName).emit("voice-users", {
          users: Object.values(voiceRooms[roomCode] || {}),
        });
      }
    }

    for (const roomCode in screenShares) {
      if (screenShares[roomCode] === socket.id) {
        delete screenShares[roomCode];

        if (rooms[roomCode]) {
          rooms[roomCode].screenShare = null;
        }

        io.to(roomCode).emit("screen-share-stopped", {
          broadcaster: socket.id,
        });
      }
    }

    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }

    emitPresence();
  });
});

const PORT = process.env.PORT || 5000;

connectDB();

server.listen(PORT, () => {
  console.log(`VoryApp server ${PORT} portunda çalışıyor 🚀`);
});