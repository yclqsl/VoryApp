require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const rooms = {};
const onlineUsers = new Map();
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

function removeUserFromRooms(socketId) {
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const leavingUser = room.users.find((user) => user.id === socketId);

    if (!leavingUser) continue;

    room.users = room.users.filter((user) => user.id !== socketId);

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
    }

    io.to(roomCode).emit(
      "system-message",
      `${leavingUser.username} odadan ayrıldı.`
    );

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

    onlineUsers.set(String(userId), {
      socketId: socket.id,
      userId: String(userId),
      username: username || "Kullanıcı",
    });

    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.values()));
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

    io.to(roomCode).emit(
      "system-message",
      `${username || "Misafir"} odayı oluşturdu.`
    );
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

    io.to(roomCode).emit(
      "system-message",
      `${username || "Misafir"} odaya katıldı.`
    );

    if (room.videoUrl) {
      socket.emit("video-updated", room.videoUrl);
      socket.emit("video-sync", getSyncedVideoState(room));
    }
  });

  socket.on("leave-room", ({ roomCode }) => {
    socket.leave(roomCode);
    removeUserFromRooms(socket.id);
    socket.emit("room-left");
  });

  socket.on("set-video", ({ roomCode, videoUrl }) => {
    const room = rooms[roomCode];

    if (!room) return;

    if (!isHost(roomCode, socket.id)) {
      socket.emit("room-error", "Sadece host video değiştirebilir.");
      return;
    }

    room.videoUrl = videoUrl;

    room.videoState = {
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
    };

    io.to(roomCode).emit("video-updated", videoUrl);
    io.to(roomCode).emit("video-sync", room.videoState);
    io.to(roomCode).emit("system-message", "Host yeni video ekledi.");
  });

  socket.on("video-control", ({ roomCode, action, currentTime }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    room.videoState = {
      isPlaying: action === "play",
      currentTime: currentTime || 0,
      updatedAt: Date.now(),
    };

    socket.to(roomCode).emit("video-control", {
      action,
      currentTime: currentTime || 0,
    });
  });

  socket.on("video-seek", ({ roomCode, currentTime }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    room.videoState.currentTime = currentTime || 0;
    room.videoState.updatedAt = Date.now();

    socket.to(roomCode).emit("video-seek", {
      currentTime: currentTime || 0,
    });
  });

  socket.on("video-heartbeat", ({ roomCode, currentTime, isPlaying }) => {
    const room = rooms[roomCode];

    if (!room) return;
    if (!isHost(roomCode, socket.id)) return;

    room.videoState = {
      currentTime: currentTime || 0,
      isPlaying: !!isPlaying,
      updatedAt: Date.now(),
    };
  });

  socket.on("force-video-sync", ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return;

    socket.emit("video-sync", getSyncedVideoState(room));
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

    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }

    io.emit("online-users", Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 5000;

connectDB();

server.listen(PORT, () => {
  console.log(`VoryApp server ${PORT} portunda çalışıyor 🚀`);
});