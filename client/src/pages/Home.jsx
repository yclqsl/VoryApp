import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";
import VorySidebar from "../components/VorySidebar";
import VoryTopBar from "../components/VoryTopBar";
import VoryRightPanel from "../components/VoryRightPanel";
import VoryBottomDock from "../components/VoryBottomDock";
import ReactionBurst from "../components/ReactionBurst";
import MediaQueue from "../components/MediaQueue";
import DevHealthOverlay from "../components/DevHealthOverlay";
import FeedbackWidget from "../components/FeedbackWidget";
import QuickActions from "../components/QuickActions";
import RoomPanel from "../components/RoomPanel";
import InviteBox from "../components/InviteBox";
import PresenceFriendPanel from "../components/PresenceFriendPanel";
import UserList from "../components/UserList";
import ChatPanel from "../components/ChatPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProfileCard from "../components/ProfileCard";
import VoiceChat from "../components/VoiceChat";
import ScreenShare from "../components/ScreenShare";
import MobileBottomNav from "../components/MobileBottomNav";
import AdminFeedbackPanel from "../components/AdminFeedbackPanel";

function getRoomCodeFromLocation() {
  const pathMatch = window.location.pathname.match(/^\/room\/([^/?#]+)/i);

  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]).trim().toUpperCase();
  }

  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get("room");

  return queryRoom ? queryRoom.trim().toUpperCase() : "";
}

function setRoomUrl(roomCode) {
  if (!roomCode) {
    window.history.replaceState({}, "", "/");
    return;
  }

  window.history.replaceState({}, "", `/room/${roomCode}`);
}

function readLocalJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createEmptyVoryStats() {
  return {
    roomsJoined: 0,
    watchSeconds: 0,
    mediaPlayed: 0,
    messagesSent: 0,
    reactionsUsed: 0,
    invitesSent: 0,
    friends: 0,
    syncScore: "100%",
  };
}

function formatWatchTime(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);

  if (hours >= 1) return `${hours}h`;

  const minutes = Math.floor(safeSeconds / 60);
  return minutes > 0 ? `${minutes}m` : "0h";
}

function normalizeHistoryTitle(value = "") {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v")
        ? `YouTube Video • ${url.searchParams.get("v")}`
        : "YouTube Video";
    }

    if (url.hostname.includes("youtu.be")) {
      return `YouTube Video • ${url.pathname.replace("/", "")}`;
    }

    return url.hostname || value;
  } catch {
    return value || "Vory Media";
  }
}

export default function Home({ authUser, onLogout }) {
  const [username, setUsername] = useState(authUser?.username || "");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [pendingInviteRoom, setPendingInviteRoom] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState("watch");
  const [appSection, setAppSection] = useState("watch");
  const [rightPanelTab, setRightPanelTab] = useState("queue");
  const [notifications, setNotifications] = useState([]);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [mediaQueue, setMediaQueue] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? "connected" : "offline");
  const [lastRestoreMessage, setLastRestoreMessage] = useState("");
  const [onlinePresence, setOnlinePresence] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [partyInvite, setPartyInvite] = useState(null);
  const [watchHistory, setWatchHistory] = useState(() =>
    readLocalJson("vory-watch-history", [])
  );
  const [profileStats, setProfileStats] = useState(() =>
    readLocalJson("vory-profile-stats", createEmptyVoryStats())
  );

  const currentUserPayload = {
    username: username || authUser?.username || "Misafir",
    avatar: authUser?.avatar || "",
  };

  const displayProfileStats = {
    ...profileStats,
    watchTime: formatWatchTime(profileStats.watchSeconds),
  };

  const currentRoomPresence = onlinePresence.filter((user) => user.roomCode === roomCode);
  const liveWatchingCount = roomCode ? Math.max(users.length, currentRoomPresence.length) : 0;
  const liveVoiceCount = roomCode
    ? currentRoomPresence.filter((user) => user.voiceActive || user.activity === "voice").length
    : 0;
  const liveScreenCount = roomCode
    ? currentRoomPresence.filter((user) => user.screenSharing || user.activity === "sharing-screen").length
    : 0;


  useEffect(() => {
    window.currentRoomCode = roomCode;

    if (roomCode) {
      localStorage.setItem("vory-last-room", roomCode);
    } else {
      localStorage.removeItem("vory-last-room");
    }
  }, [roomCode]);

  useEffect(() => {
    if (currentUserPayload.username) {
      localStorage.setItem("vory-last-username", currentUserPayload.username);
    }
  }, [currentUserPayload.username]);

  useEffect(() => {
    writeLocalJson("vory-watch-history", watchHistory);
  }, [watchHistory]);

  useEffect(() => {
    writeLocalJson("vory-profile-stats", profileStats);
  }, [profileStats]);

  const playerRef = useRef(null);
  const ignoreEventRef = useRef(false);
  const syncIntervalRef = useRef(null);
  const pulseLockRef = useRef(false);
  const lastSoftSyncRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const invitedRoom = getRoomCodeFromLocation();

    if (invitedRoom) {
      const cleanRoom = invitedRoom.trim().toUpperCase();
      setRoomInput(cleanRoom);
      setPendingInviteRoom(cleanRoom);
      setAppSection("room");
      setActiveMobileTab("room");
      toast.success(`Davet linki algılandı: ${cleanRoom}`);

      const joinTimer = setTimeout(() => {
        joinRoom(cleanRoom);
      }, 350);

      return () => clearTimeout(joinTimer);
    }

    const restoreTimer = setTimeout(() => {
      restorePreviousSession("initial-load");
    }, 500);

    return () => clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      setConnectionStatus("connected");

      const savedRoom = localStorage.getItem("vory-last-room");
      const savedUsername = localStorage.getItem("vory-last-username") || currentUserPayload.username;

      if (savedRoom && !roomCode) {
        socket.emit("rejoin-session", {
          roomCode: savedRoom,
          username: savedUsername,
          avatar: authUser?.avatar || "",
          reason: "socket-connect",
        });
      }

      if (roomCode) {
        socket.emit("request-sync", {
          roomCode,
          reason: "socket-connect",
        });
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("offline");
    });

    socket.io?.on?.("reconnect_attempt", () => {
      setConnectionStatus("reconnecting");
    });

    socket.io?.on?.("reconnect", () => {
      setConnectionStatus("connected");
    });

    socket.on("restore-failed", ({ message }) => {
      setLastRestoreMessage(message || "Oda geri yüklenemedi.");
      localStorage.removeItem("vory-last-room");
    });

    socket.on("room-snapshot", (snapshot) => {
      if (!snapshot) return;

      if (snapshot.roomCode) {
        setRoomCode(snapshot.roomCode);
      }

      setUsers(snapshot.users || []);
      setCurrentMedia(snapshot.currentMedia || null);
      setMediaQueue(snapshot.mediaQueue || []);

      if (snapshot.videoUrl) {
        setVideoUrl(snapshot.videoUrl);
      }

      const me = (snapshot.users || []).find((user) => user.id === socket.id);
      setIsHost(!!me?.isHost);
      setLastRestoreMessage(snapshot.reason === "session-restore" ? "Oda geri yüklendi." : "");
    });

    socket.on("room-created", (data) => {
      setRoomUrl(data.roomCode);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Oda oluşturuldu.");
      bumpProfileStat("roomsJoined", 1);
      toast.success("Oda oluşturuldu 🚀");
    });

    socket.on("room-joined", (data) => {
      setRoomUrl(data.roomCode);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Odaya katıldın.");
      bumpProfileStat("roomsJoined", 1);
      toast.success("Odaya katıldın 🎉");
    });

    socket.on("room-left", () => {
      setRoomUrl("");
      setRoomCode("");
      setUsers([]);
      setMessages([]);
      setVideoUrl("");
      setCurrentMedia(null);
      setMediaQueue([]);
      setStatus("");
      setIsHost(false);
      setLastRestoreMessage("");
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      toast.success("Odadan ayrıldın.");
    });

    socket.on("room-users", (roomUsers) => {
      setUsers(roomUsers);
      const me = roomUsers.find((user) => user.id === socket.id);
      setIsHost(!!me?.isHost);
    });

    socket.on("video-updated", (url) => {
      setVideoUrl(url);
      recordWatchItem({
        url,
        title: normalizeHistoryTitle(url),
        meta: roomCode ? `Room ${roomCode}` : "Vory watch session",
      });
      setStatus("Video odaya eklendi.");
      toast.success("Video odaya eklendi 🎬");
    });

    socket.on("video-control", ({ action, currentTime }) => {
      if (!playerRef.current) return;

      ignoreEventRef.current = true;
      playerRef.current.seekTo(currentTime, true);

      if (action === "play") playerRef.current.playVideo();
      if (action === "pause") playerRef.current.pauseVideo();

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, 700);
    });

    socket.on("video-seek", ({ currentTime }) => {
      if (!playerRef.current) return;

      ignoreEventRef.current = true;
      playerRef.current.seekTo(currentTime, true);

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, 700);
    });

    function applySyncState({ isPlaying, currentTime, soft = false }) {
      if (!playerRef.current) return;

      const targetTime = Math.max(0, Number(currentTime) || 0);
      const localTime = playerRef.current.getCurrentTime?.() || 0;
      const localState = playerRef.current.getPlayerState?.();
      const drift = Math.abs(localTime - targetTime);

      ignoreEventRef.current = true;

      if (soft) {
        const now = Date.now();

        if (now - lastSoftSyncRef.current > 1200 && drift > 1.2) {
          lastSoftSyncRef.current = now;
          playerRef.current.seekTo(targetTime, true);
        }
      } else if (drift > 0.75) {
        playerRef.current.seekTo(targetTime, true);
      }

      if (isPlaying && localState !== 1) {
        playerRef.current.playVideo();
      }

      if (!isPlaying && localState === 1) {
        playerRef.current.pauseVideo();
      }

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, 650);
    }

    socket.on("video-sync", (state) => {
      applySyncState({ ...state, soft: false });
    });

    socket.on("video-soft-sync", (state) => {
      applySyncState({ ...state, soft: true });
    });

    socket.on("video-sync-pulse", (state) => {
      if (isHost || pulseLockRef.current) return;

      pulseLockRef.current = true;
      applySyncState({ ...state, soft: true });

      setTimeout(() => {
        pulseLockRef.current = false;
      }, 900);
    });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, `${data.sender}: ${data.message}`]);
    });

    socket.on("user-typing", ({ username }) => {
      setTypingUser(username || "Kullanıcı");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser("");
      }, 2200);
    });

    socket.on("user-stop-typing", () => {
      setTypingUser("");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    });

    socket.on("system-message", (msg) => {
      setMessages((prev) => [...prev, `⚙️ ${msg}`]);
    });

    socket.on("room-error", (message) => {
      toast.error(message);
    });

    socket.on("online-users", (presenceUsers) => {
      setOnlinePresence(presenceUsers || []);
    });

    socket.on("presence-changed", (presenceUsers) => {
      setOnlinePresence(presenceUsers || []);
    });

    socket.on("notification:new", (notification) => {
      addLocalNotification(notification);

      if (notification?.message) {
        toast(notification.message, {
          icon:
            notification.type === "screen"
              ? "📺"
              : notification.type === "voice"
                ? "🎤"
                : notification.type === "video"
                  ? "🎬"
                  : "🔔",
        });
      }
    });

    socket.on("media-queue-updated", ({ currentMedia, queue }) => {
      setCurrentMedia(currentMedia || null);
      setMediaQueue(queue || []);
    });

    socket.on("media-current-updated", (mediaItem) => {
      setCurrentMedia(mediaItem || null);

      if (mediaItem?.url) {
        recordWatchItem({
          url: mediaItem.url,
          title: mediaItem.title || normalizeHistoryTitle(mediaItem.url),
          meta: mediaItem.addedBy ? `Added by ${mediaItem.addedBy}` : "Current media",
        });
      }
    });

    socket.on("party-invite-received", (invite) => {
      setPartyInvite(invite);

      addLocalNotification({
        ...invite,
        type: "invite",
        title: "Party Invite",
        message: `${invite.fromUsername || "Kullanıcı"} seni odaya davet etti.`,
        roomCode: invite.roomCode,
      });

      toast.success(`${invite.fromUsername || "Kullanıcı"} seni davet etti 🎉`);
    });

    socket.on("reaction:new", (reaction) => {
      addVisualReaction(reaction);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("restore-failed");
      socket.off("room-snapshot");
      socket.io?.off?.("reconnect_attempt");
      socket.io?.off?.("reconnect");
      socket.off("room-created");
      socket.off("room-joined");
      socket.off("room-left");
      socket.off("room-users");
      socket.off("video-updated");
      socket.off("video-control");
      socket.off("video-seek");
      socket.off("video-sync");
      socket.off("video-soft-sync");
      socket.off("video-sync-pulse");

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      socket.off("receive-message");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("system-message");
      socket.off("room-error");
      socket.off("online-users");
      socket.off("presence-changed");
      socket.off("notification:new");
      socket.off("media-queue-updated");
      socket.off("media-current-updated");
      socket.off("party-invite-received");
      socket.off("reaction:new");
    };
  }, []);


  useEffect(() => {
    if (!roomCode) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    socket.emit("force-video-sync", { roomCode });

    syncIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const currentTime = playerRef.current.getCurrentTime?.() || 0;
      const playerState = playerRef.current.getPlayerState?.();
      const playing = playerState === 1;

      if (playing) {
        bumpProfileStat("watchSeconds", isHost ? 6 : 7);
      }

      if (isHost) {
        socket.emit("video-heartbeat", {
          roomCode,
          currentTime,
          isPlaying: playing,
        });
      } else {
        socket.emit("client-sync-state", {
          roomCode,
          currentTime,
          isPlaying: playing,
        });
      }
    }, isHost ? 1000 : 1500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [roomCode, isHost]);


  useEffect(() => {
    socket.emit("presence-update", {
      roomCode,
      activity: roomCode ? (videoUrl ? "watching" : "in-room") : "idle",
      voiceActive: false,
      screenSharing: false,
    });
  }, [roomCode, videoUrl]);

  function bumpProfileStat(key, amount = 1) {
    setProfileStats((prev) => ({
      ...prev,
      [key]: Math.max(0, Number(prev?.[key] || 0) + amount),
    }));
  }

  function recordWatchItem({ url, title, meta = "Vory watch session" }) {
    const cleanUrl = String(url || "").trim();

    if (!cleanUrl) return;

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: cleanUrl,
      title: title || normalizeHistoryTitle(cleanUrl),
      meta,
      progress: "Ready",
      createdAt: Date.now(),
    };

    setWatchHistory((prev) => {
      const filtered = (prev || []).filter((oldItem) => oldItem.url !== cleanUrl);
      return [item, ...filtered].slice(0, 10);
    });

    bumpProfileStat("mediaPlayed", 1);
  }

  function resumeWatchItem(item) {
    if (!item?.url) return;

    setVideoInput(item.url);
    setAppSection("watch");
    setActiveMobileTab("watch");
    setRightPanelTab("queue");

    if (!roomCode) {
      toast("Medya hazırlandı. Oynatmak için önce oda oluştur veya odaya gir.", {
        icon: "🎬",
      });
      return;
    }

    socket.emit("set-video", {
      roomCode,
      videoUrl: item.url,
      title: item.title || item.url,
    });

    toast.success("Geçmişten medya başlatıldı 🎬");
  }

  function createRoom() {
    socket.emit("create-room", currentUserPayload);
  }

  function joinRoom(customRoomCode) {
    const targetRoom = (customRoomCode || roomInput).trim().toUpperCase();

    if (!targetRoom) {
      toast.error("Oda kodu gir kanks");
      return;
    }

    socket.emit("join-room", {
      roomCode: targetRoom,
      ...currentUserPayload,
    });
  }

  function joinPendingInvite() {
    if (!pendingInviteRoom) return;
    joinRoom(pendingInviteRoom);
  }

  function leaveRoom() {
    if (!roomCode) return;
    socket.emit("leave-room", { roomCode });
  }

  function getInviteLink() {
    if (!roomCode) return "";
    return `${window.location.origin}/room/${roomCode}`;
  }

  async function copyInviteLink() {
    const inviteLink = getInviteLink();

    if (!inviteLink) {
      toast.error("Önce oda oluştur veya odaya gir.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied 🔗");
    } catch (error) {
      toast.error("Link kopyalanamadı, manuel kopyala.");
    }
  }

  function setRoomVideo() {
    if (!roomCode) {
      toast.error("Önce odaya gir");
      return;
    }

    if (!videoInput.trim()) {
      toast.error("YouTube linki gir");
      return;
    }

    const cleanUrl = videoInput.trim();

    recordWatchItem({
      url: cleanUrl,
      title: normalizeHistoryTitle(cleanUrl),
      meta: `Room ${roomCode}`,
    });

    socket.emit("set-video", {
      roomCode,
      videoUrl: cleanUrl,
      title: cleanUrl,
    });
  }


  function addToQueue(videoUrl, title) {
    if (!roomCode) {
      toast.error("Önce odaya gir");
      return;
    }

    socket.emit("media-add-to-queue", {
      roomCode,
      videoUrl,
      title,
    });
  }

  function playNextMedia() {
    if (!roomCode) return;
    socket.emit("media-play-next", { roomCode });
  }

  function removeFromQueue(mediaId) {
    if (!roomCode) return;
    socket.emit("media-remove-from-queue", { roomCode, mediaId });
  }

  function clearMediaQueue() {
    if (!roomCode) return;
    socket.emit("media-clear-queue", { roomCode });
  }


  function handleTyping() {
    if (!roomCode) return;

    socket.emit("typing-start", {
      roomCode,
      username: currentUserPayload.username,
    });
  }

  function sendMessage() {
    if (!roomCode) {
      toast.error("Önce odaya gir");
      return;
    }

    if (!message.trim()) return;

    socket.emit("send-message", {
      roomCode,
      message,
      username: currentUserPayload.username,
    });

    socket.emit("typing-stop", { roomCode });

    bumpProfileStat("messagesSent", 1);
    setTypingUser("");
    setMessage("");
  }

  function handleVideoControl(action, currentTime) {
    if (!roomCode) return;
    socket.emit("video-control", { roomCode, action, currentTime });
  }

  function handleVideoSeek(currentTime) {
    if (!roomCode) return;
    socket.emit("video-seek", { roomCode, currentTime });
  }






  function restorePreviousSession(reason = "manual") {
    const savedRoom = localStorage.getItem("vory-last-room");
    const savedUsername = localStorage.getItem("vory-last-username") || currentUserPayload.username;

    if (!savedRoom || roomCode) return;

    setLastRestoreMessage("Önceki oda geri yükleniyor...");

    socket.emit("rejoin-session", {
      roomCode: savedRoom,
      username: savedUsername,
      avatar: authUser?.avatar || "",
      reason,
    });
  }

  function requestHardSync(reason = "manual") {
    if (!roomCode) return;

    socket.emit("request-sync", {
      roomCode,
      reason,
    });
  }

  function addLocalNotification(notification) {
    const safeNotification = {
      id: notification?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: notification?.type || "system",
      title: notification?.title || "VoryApp",
      message: notification?.message || "",
      roomCode: notification?.roomCode || roomCode || "",
      createdAt: notification?.createdAt || Date.now(),
      read: false,
    };

    setNotifications((prev) => [safeNotification, ...prev].slice(0, 50));
  }

  function markNotificationsRead() {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function addVisualReaction(reaction) {
    const visualReaction = {
      ...reaction,
      visualId: `${reaction.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: 18 + Math.random() * 64,
      delay: Math.random() * 120,
    };

    setReactions((prev) => [...prev.slice(-14), visualReaction]);

    setTimeout(() => {
      setReactions((prev) =>
        prev.filter((item) => item.visualId !== visualReaction.visualId)
      );
    }, 2400);
  }

  function sendReaction(emoji) {
    if (!roomCode) {
      toast.error("Önce odaya gir.");
      return;
    }

    const localReaction = {
      id: `local-${Date.now()}`,
      emoji,
      username: currentUserPayload.username,
      roomCode,
      createdAt: Date.now(),
    };

    addVisualReaction(localReaction);

    socket.emit("reaction:send", {
      roomCode,
      emoji,
      username: currentUserPayload.username,
    });

    bumpProfileStat("reactionsUsed", 1);
  }

  function sendPartyInvite(targetUser) {
    if (!roomCode) {
      toast.error("Önce oda oluştur veya odaya gir.");
      return;
    }

    if (!targetUser?.socketId) {
      toast.error("Davet gönderilecek kullanıcı bulunamadı.");
      return;
    }

    socket.emit("party-invite-send", {
      targetSocketId: targetUser.socketId,
      roomCode,
      fromUsername: currentUserPayload.username,
    });

    bumpProfileStat("invitesSent", 1);
    toast.success(`${targetUser.username || "Kullanıcı"} davet edildi 🎉`);
  }

  function acceptPartyInvite() {
    if (!partyInvite?.roomCode) return;

    joinRoom(partyInvite.roomCode);
    setPartyInvite(null);
  }

  function rejectPartyInvite() {
    setPartyInvite(null);
  }

  function handleSectionChange(section) {
    setAppSection(section);

    if (section === "watch") {
      setRightPanelTab("queue");
      setActiveMobileTab("watch");
      return;
    }

    if (section === "chat") {
      setRightPanelTab("chat");
      setActiveMobileTab("chat");
      return;
    }

    if (section === "friends") {
      setRightPanelTab("people");
      setActiveMobileTab("social");
      return;
    }

    if (section === "admin") {
      setActiveMobileTab("admin");
      return;
    }

    setActiveMobileTab(section);
  }

  function renderRoomInviteCard() {
    if (!roomCode) return null;

    return (
      <div className="glass-panel flex flex-col gap-4 border-violet-400/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-200/60">
            V12 Room Join Link
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Arkadaşını direkt odaya al
          </h2>
          <p className="mt-2 break-all rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/70">
            {getInviteLink()}
          </p>
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={copyInviteLink}>
          Linki Kopyala
        </button>
      </div>
    );
  }

  function renderDesktopMain() {
    if (appSection === "room") {
      return (
        <div className="vory-v5-page-grid">
          <RoomPanel
            username={username}
            setUsername={setUsername}
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            roomCode={roomCode}
            status={status}
            onCreateRoom={createRoom}
            onJoinRoom={() => joinRoom()}
            onLeaveRoom={leaveRoom}
          />

          {renderRoomInviteCard()}
          <InviteBox roomCode={roomCode} />
          <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
          <UserList users={users} />
        </div>
      );
    }

    if (appSection === "voice") {
      return (
        <div className="vory-v5-page-grid">
          <VoiceChat roomCode={roomCode} username={currentUserPayload.username} />
          <UserList users={users} />
          <ProfileCard authUser={authUser} roomCode={roomCode} connectionStatus={connectionStatus} stats={displayProfileStats} watchHistory={watchHistory} onResumeWatch={resumeWatchItem} />
        </div>
      );
    }

    if (appSection === "chat") {
      return (
        <div className="vory-v5-chat-focus">
          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={sendMessage}
            typingUser={typingUser}
            onTyping={handleTyping}
          />
        </div>
      );
    }

    if (appSection === "friends") {
      return (
        <div className="vory-v5-page-grid">
          <ProfileCard authUser={authUser} roomCode={roomCode} connectionStatus={connectionStatus} stats={displayProfileStats} watchHistory={watchHistory} onResumeWatch={resumeWatchItem} />
          <PresenceFriendPanel
            onlineUsers={onlinePresence}
            currentSocketId={socket.id}
            onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
          onInviteFriend={sendPartyInvite}
          />
        </div>
      );
    }

    if (appSection === "admin") {
      return <AdminFeedbackPanel authUser={authUser} />;
    }

    return (
      <div className="vory-v5-watch-layout">
        <section className="vory-v5-player-card">
          <VideoPlayer
            videoUrl={videoUrl}
            videoInput={videoInput}
            setVideoInput={setVideoInput}
            onSetVideo={setRoomVideo}
            onVideoControl={handleVideoControl}
            onVideoSeek={handleVideoSeek}
            playerRef={playerRef}
            ignoreEventRef={ignoreEventRef}
            isHost={isHost}
          />
        </section>

        <VoryRightPanel
          activeTab={rightPanelTab}
          onChange={setRightPanelTab}
          roomCode={roomCode}
          isHost={isHost}
          currentMedia={currentMedia}
          mediaQueue={mediaQueue}
          onAddMedia={addToQueue}
          onPlayNext={playNextMedia}
          onRemoveMedia={removeFromQueue}
          onClearQueue={clearMediaQueue}
          messages={messages}
          message={message}
          setMessage={setMessage}
          onSendMessage={sendMessage}
          users={users}
          onlinePresence={onlinePresence}
          currentSocketId={socket.id}
          onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
          onInviteFriend={sendPartyInvite}
        />
      </div>
    );
  }

  function renderMobilePanel() {
    if (activeMobileTab === "watch") {
      return (
        <section className="flex min-w-0 flex-col gap-4">
          <VideoPlayer
            videoUrl={videoUrl}
            videoInput={videoInput}
            setVideoInput={setVideoInput}
            onSetVideo={setRoomVideo}
            onVideoControl={handleVideoControl}
            onVideoSeek={handleVideoSeek}
            playerRef={playerRef}
            ignoreEventRef={ignoreEventRef}
            isHost={isHost}
          />

          <ScreenShare roomCode={roomCode} username={currentUserPayload.username} />

          <MediaQueue
            roomCode={roomCode}
            isHost={isHost}
            currentMedia={currentMedia}
            queue={mediaQueue}
            onAdd={addToQueue}
            onPlayNext={playNextMedia}
            onRemove={removeFromQueue}
            onClear={clearMediaQueue}
          />
        </section>
      );
    }

    if (activeMobileTab === "voice") {
      return (
        <section className="flex min-w-0 flex-col gap-4">
          <VoiceChat roomCode={roomCode} username={currentUserPayload.username} />
          <UserList users={users} />
        </section>
      );
    }

    if (activeMobileTab === "chat") {
      return (
        <section className="flex min-w-0 flex-col gap-4">
          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={sendMessage}
            typingUser={typingUser}
            onTyping={handleTyping}
          />
          <InviteBox roomCode={roomCode} />
        </section>
      );
    }

    if (activeMobileTab === "room") {
      return (
        <section className="flex min-w-0 flex-col gap-4">
          <RoomPanel
            username={username}
            setUsername={setUsername}
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            roomCode={roomCode}
            status={status}
            onCreateRoom={createRoom}
            onJoinRoom={() => joinRoom()}
            onLeaveRoom={leaveRoom}
          />

          {renderRoomInviteCard()}
          <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
        </section>
      );
    }

    if (activeMobileTab === "admin") {
      return (
        <section className="flex min-w-0 flex-col gap-4">
          <AdminFeedbackPanel authUser={authUser} />
        </section>
      );
    }

    return (
      <section className="flex min-w-0 flex-col gap-4">
        <ProfileCard authUser={authUser} roomCode={roomCode} connectionStatus={connectionStatus} stats={displayProfileStats} watchHistory={watchHistory} onResumeWatch={resumeWatchItem} />
        <PresenceFriendPanel
          onlineUsers={onlinePresence}
          currentSocketId={socket.id}
          onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
        onInviteFriend={sendPartyInvite}
          />
      </section>
    );
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-10 top-20 h-96 w-96 rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-indigo-700/15 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen gap-3 p-3 pb-24 sm:p-4 sm:pb-24 lg:gap-3 lg:p-3 xl:gap-4 xl:p-4">
        <VorySidebar
          activeSection={appSection}
          onChange={handleSectionChange}
          roomCode={roomCode}
          onlineCount={onlinePresence.length}
          userCount={users.length}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <VoryTopBar
            authUser={authUser}
            onLogout={onLogout}
            isHost={isHost}
            roomCode={roomCode}
            userCount={users.length}
            watchingCount={liveWatchingCount}
            voiceCount={liveVoiceCount}
            screenCount={liveScreenCount}
            connectionStatus={connectionStatus}
            lastRestoreMessage={lastRestoreMessage}
            onRestore={() => restorePreviousSession("manual-click")}
            onForceSync={requestHardSync}
            notifications={notifications}
            onMarkNotificationsRead={markNotificationsRead}
            onClearNotifications={clearNotifications}
          />

          {partyInvite && (
            <div className="vory-party-invite-banner glass-panel">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-200/70">
                  Party Invite
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {partyInvite.fromUsername || "Kullanıcı"} seni davet etti
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Room {partyInvite.roomCode}
                </p>
              </div>

              <div className="flex gap-2">
                <button className="btn-primary w-auto" onClick={acceptPartyInvite}>
                  Katıl
                </button>
                <button className="btn-secondary w-auto" onClick={rejectPartyInvite}>
                  Reddet
                </button>
              </div>
            </div>
          )}

          {pendingInviteRoom && !roomCode && (
            <div className="glass-panel flex flex-col gap-4 border-emerald-400/25 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300/70">
                  Room Link Algılandı
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {pendingInviteRoom} odasına yönlendiriliyorsun
                </h2>
              </div>

              <button className="btn-primary w-full sm:w-auto" onClick={joinPendingInvite}>
                Tekrar Katıl
              </button>
            </div>
          )}

          <main className="hidden min-h-0 flex-1 lg:block">
            <div className="relative">
              {renderDesktopMain()}

              {appSection === "watch" && (
                <ReactionBurst reactions={reactions} />
              )}
            </div>

            {appSection === "watch" && (
              <VoryBottomDock
                roomCode={roomCode}
                isHost={isHost}
                onOpenRoom={() => handleSectionChange("room")}
                onOpenVoice={() => handleSectionChange("voice")}
                onOpenChat={() => {
                  setRightPanelTab("chat");
                  setAppSection("watch");
                }}
                onReaction={sendReaction}
                screenShare={
                  <ScreenShare
                    roomCode={roomCode}
                    username={currentUserPayload.username}
                  />
                }
              />
            )}
          </main>

          <main className="block flex-1 lg:hidden">
            <div className="mobile-stage space-y-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-200/50">
                      Vory Mobile
                    </p>
                    <h1 className="mt-1 text-xl font-black">
                      {roomCode ? `Room ${roomCode}` : "Lobby"}
                    </h1>
                  </div>

                  <div className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                    👥 {users.length || onlinePresence.length}
                  </div>
                </div>
              </div>

              {renderMobilePanel()}
            </div>
          </main>

          <FeedbackWidget
            authUser={authUser}
            roomCode={roomCode}
            connectionStatus={connectionStatus}
          />

          <DevHealthOverlay
            connectionStatus={connectionStatus}
            roomCode={roomCode}
            isHost={isHost}
            userCount={users.length}
            queueCount={mediaQueue.length}
            currentMedia={currentMedia}
          />

          <MobileBottomNav
            activeTab={activeMobileTab}
            onChange={setActiveMobileTab}
            unreadMessages={messages.length}
            onlineCount={onlinePresence.length}
            roomCode={roomCode}
          />
        </div>
      </div>
    </div>
  );
}
