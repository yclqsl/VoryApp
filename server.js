require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const rooms = {};
const onlineUsers = new Map();
const voiceRooms = {};
const screenShares = {};
const feedbackItems = [];

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


app.post("/api/feedback", (req, res) => {
  const {
    type,
    title,
    message,
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

  const feedback = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: type || "bug",
    title: String(title).slice(0, 140),
    message: String(message).slice(0, 3000),
    roomCode: roomCode || "",
    username: username || "Anonim",
    userId: userId || "",
    userAgent: userAgent || "",
    appVersion: appVersion || "beta",
    metadata: metadata || {},
    status: "open",
    createdAt: Date.now(),
  };

  feedbackItems.unshift(feedback);

  if (feedbackItems.length > 500) {
    feedbackItems.pop();
  }

  res.status(201).json({
    message: "Feedback alındı.",
    feedback,
  });
});

app.get("/api/feedback", (req, res) => {
  const adminKey = req.headers["x-admin-key"] || req.query.adminKey;

  if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      message: "Yetkisiz.",
    });
  }

  res.json({
    count: feedbackItems.length,
    feedback: feedbackItems,
  });
});


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

function createRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  };
}

function emitMediaQueue(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  io.to(roomCode).emit("media-queue-updated", {
    currentMedia: room.currentMedia || null,
    queue: room.mediaQueue || [],
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

  socket.on("user-online", ({ userId, username }) => {
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
  });

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.values()));
    socket.emit("presence-changed", Array.from(onlineUsers.values()));
  });

  socket.on("request-room-snapshot", ({ roomCode }) => {
    if (!roomCode || !rooms[roomCode]) {
      socket.emit("room-error", "Oda bulunamadı");
      return;
    }

    emitRoomSnapshot(socket, roomCode, "manual-snapshot");
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
  });

  socket.on("join-room", ({ roomCode, username, avatar }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit("room-error", "Oda bulunamadı");
      return;
    }

    socket.join(roomCode);

    room.users.push({
      id: socket.id,
      username: username || "Misafir",
      avatar: avatar || "",
      isHost: false,
    });

    socket.emit("room-joined", {
      roomCode,
      isHost: false,
    });

    io.to(roomCode).emit("room-users", room.users);

    updateRoomPresence(socket.id, roomCode, {
      activity: room.videoUrl ? "watching" : "in-room",
      voiceActive: false,
      screenSharing: !!screenShares[roomCode],
    });

    emitPresence();

    io.to(roomCode).emit(
      "system-message",
      `${username || "Misafir"} odaya katıldı.`
    );

    emitNotification(roomCode, {
      type: "room",
      title: "Odaya katıldı",
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

    if (screenShares[roomCode]) {
      socket.emit("screen-share-started", {
        broadcaster: screenShares[roomCode],
      });
    }

    emitRoomSnapshot(socket, roomCode, "join-room");
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
    if (!rooms[roomCode] || !message) return;

    io.to(roomCode).emit("receive-message", {
      sender: username || "Misafir",
      message,
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