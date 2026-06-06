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
import QuickActions from "../components/QuickActions";
import RoomPanel from "../components/RoomPanel";
import AnimatedBackground from "../components/AnimatedBackground";
import InviteBox from "../components/InviteBox";
import PartyDiscoveryPanel from "../components/PartyDiscoveryPanel";
import PresenceFriendPanel from "../components/PresenceFriendPanel";
import UserList from "../components/UserList";
import ChatPanel from "../components/ChatPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProfileCard from "../components/ProfileCard";
import VoiceChat from "../components/VoiceChat";
import ScreenShare from "../components/ScreenShare";
import MobileBottomNav from "../components/MobileBottomNav";
import AdminFeedbackPanel from "../components/AdminFeedbackPanel";
import FeedbackWidget from "../components/FeedbackWidget";
import FriendRequestsPanel from "../components/FriendRequestsPanel";
import { api } from "../services/api";

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

function getVoryAuthToken() {
  try {
    return localStorage.getItem("vory_token") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function hasVoryAuthSession(userId = "") {
  return !!String(userId || "").trim() && !!getVoryAuthToken();
}

function isUnauthorizedError(error) {
  return error?.response?.status === 401 || error?.response?.status === 403;
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


function formatPlaybackTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

function getThemeShellClass() {
  return "from-[#05030d] via-[#10071f] to-[#020716]";
}

function getThemeGlowClass(slot = 1) {
  if (slot === 1) return "bg-violet-600/18";
  if (slot === 2) return "bg-fuchsia-600/14";
  return "bg-sky-500/10";
}

export default function Home({ authUser, onLogout }) {
  const [username, setUsername] = useState(authUser?.username || "");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomTheme, setRoomTheme] = useState("voryapp");
  const [roomSettings, setRoomSettings] = useState({ publicRoom: false });
  const [discoveryRooms, setDiscoveryRooms] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
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
  const [rightPanelTab, setRightPanelTab] = useState("chat");
  const [notifications, setNotifications] = useState([]);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [mediaQueue, setMediaQueue] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? "connected" : "offline");
  const [presenceIdle, setPresenceIdle] = useState(false);
  const [lastRestoreMessage, setLastRestoreMessage] = useState("");
  const [hostTransferMessage, setHostTransferMessage] = useState("");
  const [onlinePresence, setOnlinePresence] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [partyInvite, setPartyInvite] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [activeDM, setActiveDM] = useState(null);
  const [dmMessages, setDmMessages] = useState({});
  const [dmInput, setDmInput] = useState("");
  const [dmUnread, setDmUnread] = useState({});
  const [dmTypingUser, setDmTypingUser] = useState("");
  const [inviteCooldowns, setInviteCooldowns] = useState({});
  const [watchHistory, setWatchHistory] = useState(() =>
    readLocalJson("vory-watch-history", [])
  );
  const [profileStats, setProfileStats] = useState(() =>
    readLocalJson("vory-profile-stats", createEmptyVoryStats())
  );
  const [profileProgress, setProfileProgress] = useState(null);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [friendState, setFriendState] = useState({ friends: [], sent: [], received: [] });
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const currentUserId = authUser?._id || authUser?.id || "";

  const currentUserPayload = {
    userId: currentUserId,
    username: username || authUser?.username || "Misafir",
    avatar: authUser?.avatar || "",
  };

  const isAdminUser =
    authUser?.username === "admin" ||
    authUser?.email === "yucelinizbusiness@gmail.com";

  const displayProfileStats = {
    ...profileStats,
    friends: friendState.friends?.length || profileStats.friends || 0,
    watchTime: formatWatchTime(profileStats.watchSeconds),
  };

  const currentRoomPresence = onlinePresence.filter((user) => user.roomCode === roomCode);
  const liveWatchingCount = roomCode ? Math.max(users.length, currentRoomPresence.length) : 0;
  const activeVoiceUsers = roomCode
    ? users.filter((user) => user?.voiceActive === true || user?.inVoice === true || user?.micActive === true)
    : [];
  const liveVoiceCount = activeVoiceUsers.length;
  const liveScreenCount = roomCode
    ? currentRoomPresence.filter((user) => user.screenSharing || user.activity === "sharing-screen").length
    : 0;

  const dmLastMessages = Object.fromEntries(
    Object.entries(dmMessages || {}).map(([threadId, messages]) => {
      const lastMessage = Array.isArray(messages) ? messages[messages.length - 1] : null;
      return [threadId, lastMessage || null];
    })
  );

  const totalDmUnread = Object.values(dmUnread || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );


  async function loadProfileProgress() {
    if (!hasVoryAuthSession(currentUserId)) return;

    try {
      const response = await api.get("/users/profile-summary");
      setProfileProgress(response.data?.user || null);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error("Profile progress alınamadı:", error);
      }
    }
  }

  async function loadLeaderboard() {
    // Vory 3.1 Pure Rave: leaderboard kaldırıldı.
  }

  function syncProfileProgress(nextStats) {
    // Vory 3.1 Pure Rave: XP/progress sync kapalı.
  }


  async function claimDailyMission(mission) {
    // Vory 3.1 Pure Rave: mission/XP kaldırıldı.
  }




  async function refreshCustomizationStore() {
    // Vory 3.1 Pure Rave: cosmetics/store kaldırıldı.
  }

  async function unlockCustomizationItem(item) {
    // Vory 3.1 Pure Rave: cosmetics kaldırıldı.
  }

  async function equipCustomizationItem(item) {
    // Vory 3.1 Pure Rave: cosmetics kaldırıldı.
  }

  async function loadFriendState() {
    if (!hasVoryAuthSession(currentUserId)) return;

    try {
      setFriendsLoading(true);
      const response = await api.get(`/friends/state/${currentUserId}`);
      setFriendState(response.data || { friends: [], sent: [], received: [] });
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error("Friend state alınamadı:", error);
        toast.error(error?.response?.data?.message || "Friend listesi alınamadı.");
      }
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    loadFriendState();
  }, [currentUserId]);

  useEffect(() => {
    loadProfileProgress();
    // VoryApp Rave sade mod: XP/leaderboard/store yükleri kapalı.
  }, [currentUserId]);

  useEffect(() => {
    if (!hasVoryAuthSession(currentUserId) || friendSearchQuery.trim().length < 2) {
      setFriendSearchResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      try {
        const response = await api.get("/friends/search", {
          params: {
            q: friendSearchQuery.trim(),
            currentUserId,
          },
        });

        setFriendSearchResults(response.data?.users || []);
      } catch (error) {
        console.error("Friend search hatası:", error);
      }
    }, 350);

    return () => clearTimeout(searchTimer);
  }, [friendSearchQuery, currentUserId]);


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
    if (!currentUserId) return;

    const announcePresence = () => {
      socket.emit("user-online", {
        userId: currentUserId,
        username: currentUserPayload.username,
        avatar: authUser?.avatar || "",
      });

      socket.emit("get-online-users");
      socket.emit("get-discovery-rooms");
    };

    announcePresence();
    socket.on("connect", announcePresence);

    return () => {
      socket.off("connect", announcePresence);
    };
  }, [currentUserId, currentUserPayload.username, authUser?.avatar]);

  useEffect(() => {
    let idleTimer = null;

    const markActive = () => {
      setPresenceIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setPresenceIdle(true), 45000);
    };

    const markVisibility = () => {
      if (document.hidden) {
        setPresenceIdle(true);
        return;
      }

      markActive();
    };

    markActive();

    window.addEventListener("mousemove", markActive);
    window.addEventListener("mousedown", markActive);
    window.addEventListener("keydown", markActive);
    window.addEventListener("touchstart", markActive);
    document.addEventListener("visibilitychange", markVisibility);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("mousedown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("touchstart", markActive);
      document.removeEventListener("visibilitychange", markVisibility);
    };
  }, []);

  useEffect(() => {
    writeLocalJson("vory-watch-history", watchHistory);
  }, [watchHistory]);

  useEffect(() => {
    writeLocalJson("vory-profile-stats", profileStats);
  }, [profileStats]);

  useEffect(() => {
    if (!hasVoryAuthSession(currentUserId)) return;

    const syncTimer = setTimeout(() => {
      syncProfileProgress(profileStats);
    }, 900);

    return () => clearTimeout(syncTimer);
  }, [profileStats, currentUserId, friendState.friends?.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setInviteCooldowns((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(prev || {}).filter(([, expiresAt]) => Number(expiresAt) > now)
        );

        return Object.keys(next).length === Object.keys(prev || {}).length ? prev : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const playerRef = useRef(null);
  const ignoreEventRef = useRef(false);
  const syncIntervalRef = useRef(null);
  const pulseLockRef = useRef(false);
  const lastSoftSyncRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const activeDMRef = useRef(null);
  const currentUserIdRef = useRef(currentUserId);
  const pendingResumeRef = useRef(null);

  useEffect(() => {
    activeDMRef.current = activeDM;
  }, [activeDM]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    const invitedRoom = getRoomCodeFromLocation();

    if (invitedRoom) {
      const cleanRoom = invitedRoom.trim().toUpperCase();
      setRoomInput(cleanRoom);
      setPendingInviteRoom(cleanRoom);
      setAppSection("room");
      setActiveMobileTab("settings");
      // V13.3.1.4 polish: gereksiz "Davet linki algılandı" toastını kaldırdık.
      // Oda aktif değilse sadece net hata/UX mesajı gösterilecek.

      const joinTimer = setTimeout(() => {
        joinRoom(cleanRoom);
      }, 350);

      return () => clearTimeout(joinTimer);
    }

    // Vory 3.1.4: Rave davranışı - login/reload sonrası eski odaya otomatik dönme kapalı.
    // Kullanıcı sadece davet linki veya oda kodu ile odaya girer.
    localStorage.removeItem("vory-last-room");
    return undefined;
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      setConnectionStatus("connected");

      // Vory 3.1.4: otomatik rejoin kapalı. Logout sonrası tekrar girişte lobby açılır.
      localStorage.removeItem("vory-last-room");

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

      // VoryApp artık tek sabit temada çalışıyor.

      if (snapshot.settings) {
        setRoomSettings(snapshot.settings);
      }

      const me = (snapshot.users || []).find((user) => user.id === socket.id);
      setIsHost(!!me?.isHost);
      setLastRestoreMessage(snapshot.reason === "session-restore" ? "Oda geri yüklendi." : "");
    });

    socket.on("room-created", (data) => {
      setRoomUrl(data.roomCode);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setRoomTheme("voryapp");
      setRoomSettings(data.settings || { publicRoom: false });
      setPendingInviteRoom("");
	  setLastRestoreMessage("");
      setStatus("Oda oluşturuldu.");
      bumpProfileStat("roomsJoined", 1);
      toast.success("Oda oluşturuldu 🚀");
    });

    socket.on("room-joined", (data) => {
      setRoomUrl(data.roomCode);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setRoomTheme("voryapp");
      setRoomSettings(data.settings || { publicRoom: false });
      setPendingInviteRoom("");
	  setLastRestoreMessage("");
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
      setRoomTheme("voryapp");
      setRoomSettings({ publicRoom: false });
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

    socket.on("room-theme-updated", () => {
      setRoomTheme("voryapp");
    });

    socket.on("room-host-changed", (payload) => {
      if (!payload) return;

      const becameHost = payload.newHostId === socket.id;
      const message = becameHost
        ? "Artık host sensin 👑"
        : `${payload.newHostUsername || "Yeni kullanıcı"} yeni host oldu 👑`;

      setIsHost(becameHost);
      setHostTransferMessage(message);
      setLastRestoreMessage(message);

      addLocalNotification({
        type: "host",
        title: "Host Transfer",
        message,
        roomCode: payload.roomCode || roomCode || "",
        createdAt: payload.createdAt || Date.now(),
      });

      if (becameHost) {
        toast.success(message);
      } else {
        toast(message, { icon: "👑" });
      }

      if (payload.videoState && playerRef.current) {
        applySyncState({
          ...payload.videoState,
          soft: true,
        });
      }

      setTimeout(() => {
        setHostTransferMessage("");
      }, 6500);
    });

    socket.on("video-updated", (url) => {
      setVideoUrl(url);

      const pendingResume = pendingResumeRef.current;
      const shouldResume =
        pendingResume?.url &&
        String(pendingResume.url).trim() === String(url || "").trim() &&
        Number(pendingResume.currentTime || 0) > 5;

      recordWatchItem({
        url,
        title: pendingResume?.title || normalizeHistoryTitle(url),
        meta: roomCode ? `Room ${roomCode}` : "Vory watch session",
        currentTime: shouldResume ? Number(pendingResume.currentTime || 0) : 0,
        roomCode,
      });

      if (shouldResume) {
        const resumeTime = Number(pendingResume.currentTime || 0);
        setTimeout(() => {
          if (!playerRef.current) return;
          ignoreEventRef.current = true;
          playerRef.current.seekTo(resumeTime, true);
          setTimeout(() => {
            ignoreEventRef.current = false;
          }, 650);
        }, 900);

        pendingResumeRef.current = null;
        toast.success(`Devam ediliyor: ${formatPlaybackTime(resumeTime)} 🎬`);
      } else {
        setStatus("Video odaya eklendi.");
        toast.success("Video odaya eklendi 🎬");
      }
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
      const now = Date.now();

      const shouldSoftSeek =
        soft &&
        drift > 1.75 &&
        now - lastSoftSyncRef.current > 2600;

      const shouldHardSeek = !soft && drift > 0.9;

      if (shouldSoftSeek || shouldHardSeek) {
        lastSoftSyncRef.current = now;
        ignoreEventRef.current = true;
        playerRef.current.seekTo(targetTime, true);

        setTimeout(() => {
          ignoreEventRef.current = false;
        }, soft ? 900 : 650);
      }

      const shouldPlay = isPlaying && localState !== 1;
      const shouldPause = !isPlaying && localState === 1;

      if (shouldPlay || shouldPause) {
        ignoreEventRef.current = true;

        if (shouldPlay) playerRef.current.playVideo();
        if (shouldPause) playerRef.current.pauseVideo();

        setTimeout(() => {
          ignoreEventRef.current = false;
        }, 650);
      }
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
      }, 1800);
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

  const lower = String(message || "").toLowerCase();

  if (
    lower.includes("oda bulunamadı") ||
    lower.includes("room not found")
  ) {
    setPendingInviteRoom("");
    setLastRestoreMessage(
      "Bu oda artık aktif değil. Yeni bir davet linki iste."
    );
  }
});

    socket.on("online-users", (presenceUsers) => {
      setOnlinePresence(presenceUsers || []);
    });

    socket.on("presence-changed", (presenceUsers) => {
      setOnlinePresence(presenceUsers || []);
    });

    socket.on("discovery-rooms-updated", ({ rooms }) => {
      const nextRooms = Array.isArray(rooms) ? rooms : [];
      setDiscoveryRooms(nextRooms);
      setDiscoveryLoading(false);
    });

    socket.on("room-settings-updated", ({ settings }) => {
      setRoomSettings(settings || { publicRoom: false });
    });

    socket.on("activity:new", (activity) => {
      if (!activity) return;

      setActivityFeed((prev) => [activity, ...(prev || [])].slice(0, 50));
    });

    socket.on("dm:received", (dm) => {
      if (!dm) return;

      const threadId = String(dm.fromUserId || "");
      const activeThreadId = String(
        activeDMRef.current?.userId ||
        activeDMRef.current?._id ||
        activeDMRef.current?.id ||
        ""
      );

      setDmMessages((prev) => ({
        ...prev,
        [threadId]: [...(prev?.[threadId] || []), dm].slice(-100),
      }));

      if (activeThreadId === threadId) {
        socket.emit("dm:mark-read", {
          currentUserId: currentUserIdRef.current,
          targetUserId: threadId,
        });
        return;
      }

      setDmUnread((prev) => ({
        ...prev,
        [threadId]: Number(prev?.[threadId] || 0) + 1,
      }));
    });

    socket.on("dm:sent", (dm) => {
      if (!dm) return;

      const threadId = dm.toUserId;
      setDmMessages((prev) => {
        const existing = prev?.[threadId] || [];
        if (existing.some((item) => item.id === dm.id)) return prev;

        return {
          ...prev,
          [threadId]: [...existing, dm].slice(-100),
        };
      });
    });

    socket.on("dm:read", ({ readerUserId, messageIds = [] }) => {
      const threadId = String(readerUserId || "");
      if (!threadId) return;

      setDmMessages((prev) => {
        const existing = prev?.[threadId] || [];
        if (!existing.length) return prev;

        const idSet = new Set((messageIds || []).map((id) => String(id)));

        return {
          ...prev,
          [threadId]: existing.map((message) => {
            const messageId = String(message?._id || message?.id || "");
            const mineToReader =
              String(message?.fromUserId || "") === String(currentUserIdRef.current || "") &&
              String(message?.toUserId || "") === threadId;

            if (!mineToReader) return message;
            if (idSet.size && !idSet.has(messageId)) return message;

            return {
              ...message,
              read: true,
              status: "read",
            };
          }),
        };
      });
    });

    socket.on("dm:typing", ({ fromUserId, fromUsername }) => {
      if (!activeDM || String(activeDM.userId || activeDM._id || activeDM.id) !== String(fromUserId)) return;

      setDmTypingUser(fromUsername || "Kullanıcı");

      setTimeout(() => {
        setDmTypingUser("");
      }, 1800);
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
      socket.off("room-theme-updated");
      socket.off("room-host-changed");
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
      socket.off("discovery-rooms-updated");
      socket.off("room-settings-updated");
      socket.off("activity:new");
      socket.off("dm:received");
      socket.off("dm:sent");
      socket.off("dm:read");
      socket.off("dm:typing");
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

      if (videoUrl) {
        updateContinueWatching({
          url: videoUrl,
          title: currentMedia?.title || normalizeHistoryTitle(videoUrl),
          currentTime,
          roomCode,
          playing,
        });
      }

      const watchTitle =
        currentMedia?.title ||
        normalizeHistoryTitle(videoUrl) ||
        "Vory Media";

      if (isHost) {
        socket.emit("video-heartbeat", {
          roomCode,
          currentTime,
          isPlaying: playing,
          watchTitle,
        });
      } else {
        socket.emit("client-sync-state", {
          roomCode,
          currentTime,
          isPlaying: playing,
          watchTitle,
        });
      }
    }, isHost ? 1000 : 1500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [roomCode, isHost, currentMedia, videoUrl]);


  useEffect(() => {
    const activity = presenceIdle
      ? "away"
      : roomCode
        ? (videoUrl ? "watching" : "in-room")
        : "online";

    socket.emit("presence-update", {
      roomCode,
      activity,
      watchTitle: videoUrl ? (currentMedia?.title || normalizeHistoryTitle(videoUrl)) : "",
      watchTime: 0,
    });
  }, [roomCode, videoUrl, currentMedia, presenceIdle]);

  useEffect(() => {
    refreshDiscoveryRooms();

    const discoveryTimer = setInterval(() => {
      socket.emit("get-discovery-rooms");
    }, 20000);

    return () => clearInterval(discoveryTimer);
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      const activity = presenceIdle
        ? "away"
        : roomCode
          ? (videoUrl ? "watching" : "in-room")
          : "online";

      socket.emit("presence-heartbeat", {
        roomCode,
        activity,
        watchTitle: videoUrl ? (currentMedia?.title || normalizeHistoryTitle(videoUrl)) : "",
      });
    }, 15000);

    return () => clearInterval(heartbeat);
  }, [roomCode, videoUrl, currentMedia, presenceIdle]);

  function bumpProfileStat(key, amount = 1) {
    setProfileStats((prev) => {
      const nextStats = {
        ...prev,
        friends: friendState.friends?.length || prev?.friends || 0,
        [key]: Math.max(0, Number(prev?.[key] || 0) + amount),
      };

      return nextStats;
    });
  }

  function updateContinueWatching({ url, title, currentTime = 0, roomCode: targetRoomCode = "", playing = false }) {
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl) return;

    const safeTime = Math.max(0, Number(currentTime) || 0);
    const progressLabel = safeTime > 5 ? formatPlaybackTime(safeTime) : "Ready";

    setWatchHistory((prev) => {
      const existing = (prev || []).find((oldItem) => oldItem.url === cleanUrl) || {};
      const nextItem = {
        ...existing,
        id: existing.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: cleanUrl,
        title: title || existing.title || normalizeHistoryTitle(cleanUrl),
        meta: targetRoomCode ? `Room ${targetRoomCode}` : existing.meta || "Vory watch session",
        currentTime: safeTime,
        progress: progressLabel,
        playing: !!playing,
        updatedAt: Date.now(),
        createdAt: existing.createdAt || Date.now(),
      };

      const filtered = (prev || []).filter((oldItem) => oldItem.url !== cleanUrl);
      return [nextItem, ...filtered].slice(0, 10);
    });
  }

  function recordWatchItem({ url, title, meta = "Vory watch session", currentTime = 0, roomCode: targetRoomCode = "" }) {
    const cleanUrl = String(url || "").trim();

    if (!cleanUrl) return;

    const safeTime = Math.max(0, Number(currentTime) || 0);

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: cleanUrl,
      title: title || normalizeHistoryTitle(cleanUrl),
      meta,
      roomCode: targetRoomCode || roomCode || "",
      currentTime: safeTime,
      progress: safeTime > 5 ? formatPlaybackTime(safeTime) : "Ready",
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    setWatchHistory((prev) => {
      const existing = (prev || []).find((oldItem) => oldItem.url === cleanUrl);
      const mergedItem = existing
        ? {
            ...existing,
            ...item,
            id: existing.id || item.id,
            createdAt: existing.createdAt || item.createdAt,
            currentTime: Math.max(Number(existing.currentTime || 0), safeTime),
            progress: Math.max(Number(existing.currentTime || 0), safeTime) > 5
              ? formatPlaybackTime(Math.max(Number(existing.currentTime || 0), safeTime))
              : "Ready",
          }
        : item;

      const filtered = (prev || []).filter((oldItem) => oldItem.url !== cleanUrl);
      return [mergedItem, ...filtered].slice(0, 10);
    });

    bumpProfileStat("mediaPlayed", 1);
  }

  function resumeWatchItem(item) {
    if (!item?.url) return;

    const resumeTime = Math.max(0, Number(item.currentTime || 0));

    pendingResumeRef.current = {
      ...item,
      currentTime: resumeTime,
    };

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

    toast.success(resumeTime > 5 ? `Devam Et hazırlanıyor: ${formatPlaybackTime(resumeTime)} 🎬` : "Geçmişten medya başlatıldı 🎬");
  }

  function refreshDiscoveryRooms() {
    setDiscoveryLoading(true);
    socket.emit("get-discovery-rooms");
  }

  function togglePublicRoom(nextPublic) {
    if (!roomCode) {
      toast.error("Önce oda oluştur veya odaya gir.");
      return;
    }

    if (!isHost) {
      toast.error("Public / Private ayarını sadece host değiştirebilir.");
      return;
    }

    const nextSettings = {
      ...roomSettings,
      publicRoom: !!nextPublic,
    };

    setRoomSettings(nextSettings);
    socket.emit("room-settings-update", {
      roomCode,
      settings: nextSettings,
    });

    toast.success(nextPublic ? "Oda Discovery'de public oldu 🌍" : "Oda private moda geçti 🔒");
  }

  function createRoom() {
  setPendingInviteRoom("");
  setLastRestoreMessage("");

  socket.emit("create-room", currentUserPayload);
}

  function joinRoom(customRoomCode) {
    setPendingInviteRoom("");
    setLastRestoreMessage("");

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

  function handleLogoutCleanup() {
    try {
      if (roomCode) {
        socket.emit("leave-room", { roomCode });
      }

      localStorage.removeItem("vory-last-room");
      sessionStorage.removeItem("vory-last-room");
      window.currentRoomCode = "";
    } catch {}

    setRoomUrl("");
    setRoomCode("");
    setUsers([]);
    setMessages([]);
    setVideoUrl("");
    setCurrentMedia(null);
    setMediaQueue([]);
    setIsHost(false);
    setLastRestoreMessage("");

    onLogout?.();
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

  function voteMedia(mediaId) {
    if (!roomCode || !mediaId) return;

    socket.emit(
      "media-vote",
      {
        roomCode,
        mediaId,
        userId: currentUserId || socket.id,
        username: currentUserPayload.username,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Oy verilemedi.");
        }
      }
    );
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

    if (videoUrl) {
      updateContinueWatching({
        url: videoUrl,
        title: currentMedia?.title || normalizeHistoryTitle(videoUrl),
        currentTime,
        roomCode,
        playing: action === "play",
      });
    }

    socket.emit("video-control", { roomCode, action, currentTime });
  }

  function handleVideoSeek(currentTime) {
    if (!roomCode) return;

    if (videoUrl) {
      updateContinueWatching({
        url: videoUrl,
        title: currentMedia?.title || normalizeHistoryTitle(videoUrl),
        currentTime,
        roomCode,
        playing: true,
      });
    }

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
      ...(notification || {}),
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

  function friendStateHas(list = [], targetId = "") {
    const cleanTargetId = String(targetId || "");
    return (list || []).some((user) => String(user?._id || user?.id || user || "") === cleanTargetId);
  }

  async function sendFriendRequest(targetUser) {
    const targetId = targetUser?._id || targetUser?.id || "";

    if (!currentUserId || !targetId) {
      toast.error("Arkadaşlık isteği için giriş gerekli.");
      return;
    }

    if (friendStateHas(friendState.friends, targetId)) {
      toast("Zaten arkadaşsınız 👥");
      return;
    }

    if (friendStateHas(friendState.sent, targetId)) {
      toast("Bu kullanıcıya zaten istek gönderilmiş.");
      return;
    }

    if (friendStateHas(friendState.received, targetId)) {
      toast("Bu kullanıcı sana istek atmış, Accept ile kabul edebilirsin.");
      return;
    }

    try {
      const response = await api.post("/friends/request", {
        fromUserId: currentUserId,
        toUserId: targetId,
      });

      setFriendState(response.data?.state || friendState);
      toast.success(response.data?.message || "Arkadaşlık isteği gönderildi.");
    } catch (error) {
      if (error?.response?.data?.state) {
        setFriendState(error.response.data.state);
      }

      toast.error(error?.response?.data?.message || "Arkadaşlık isteği gönderilemedi.");
    }
  }

  async function acceptFriendRequest(targetUser) {
    if (!currentUserId || !targetUser?._id) return;

    try {
      const response = await api.post("/friends/accept", {
        currentUserId,
        requesterId: targetUser._id,
      });

      setFriendState(response.data?.state || friendState);
      toast.success(response.data?.message || "Arkadaşlık isteği kabul edildi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Arkadaşlık isteği kabul edilemedi.");
    }
  }

  async function rejectFriendRequest(targetUser) {
    if (!currentUserId || !targetUser?._id) return;

    try {
      const response = await api.post("/friends/reject", {
        currentUserId,
        requesterId: targetUser._id,
      });

      setFriendState(response.data?.state || friendState);
      toast.success(response.data?.message || "Arkadaşlık isteği reddedildi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Arkadaşlık isteği reddedilemedi.");
    }
  }

  async function removeFriend(targetUser) {
    if (!currentUserId || !targetUser?._id) return;

    try {
      const response = await api.delete(`/friends/${currentUserId}/${targetUser._id}`);
      setFriendState(response.data?.state || friendState);
      toast.success(response.data?.message || "Arkadaş silindi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Arkadaş silinemedi.");
    }
  }

  function getDMTargetId(targetUser) {
    return String(targetUser?.userId || targetUser?._id || targetUser?.id || "");
  }

  function openDM(targetUser) {
    const targetId = getDMTargetId(targetUser);

    if (!targetId) {
      toast.error("DM açılacak kullanıcı bulunamadı.");
      return;
    }

    setActiveDM({
      ...targetUser,
      userId: targetId,
      username: targetUser?.username || "Kullanıcı",
    });

    setActiveMobileTab("dm");

    setDmUnread((prev) => ({
      ...prev,
      [targetId]: 0,
    }));

    socket.emit("dm:history", {
      currentUserId,
      targetUserId: targetId,
    }, (response) => {
      if (!response?.ok) return;

      setDmMessages((prev) => ({
        ...prev,
        [targetId]: response.messages || [],
      }));

      socket.emit("dm:mark-read", {
        currentUserId,
        targetUserId: targetId,
      });
    });
  }

  function sendDMMessage() {
    const targetId = getDMTargetId(activeDM);
    const cleanMessage = dmInput.trim();

    if (!activeDM || !targetId) {
      toast.error("Önce bir DM seç.");
      return;
    }

    if (!cleanMessage) return;

    socket.emit("dm:send", {
      fromUserId: currentUserId,
      toUserId: targetId,
      fromUsername: currentUserPayload.username,
      toUsername: activeDM.username || "Kullanıcı",
      message: cleanMessage,
    }, (response) => {
      if (!response?.ok) {
        toast.error(response?.message || "DM gönderilemedi.");
        return;
      }

      setDmInput("");
    });
  }

  function handleDMTyping() {
    const targetId = getDMTargetId(activeDM);
    if (!targetId) return;

    socket.emit("dm:typing", {
      fromUserId: currentUserId,
      toUserId: targetId,
      fromUsername: currentUserPayload.username,
    });
  }

  function renderDMPanel() {
    if (!activeDM) return null;

    const targetId = getDMTargetId(activeDM);
    const messagesForThread = dmMessages?.[targetId] || [];

    return (
      <div className="fixed inset-0 z-[9998] flex flex-col overflow-hidden border border-white/10 bg-black/95 shadow-[0_24px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:bottom-24 lg:left-auto lg:right-4 lg:top-auto lg:h-auto lg:w-[390px] lg:max-w-[calc(100vw-2rem)] lg:rounded-[2rem] lg:bg-black/90">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/70">Direct Message</p>
            <h2 className="truncate text-base font-black text-white">
              {activeDM.username || "Kullanıcı"}
            </h2>
          </div>

          <button
            type="button"
            className="rounded-xl bg-white/8 px-3 py-2 text-xs font-black text-white/55 transition hover:bg-white/12 hover:text-white"
            onClick={() => setActiveDM(null)}
          >
            Kapat
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4 lg:max-h-[360px] lg:min-h-[260px]">
          {messagesForThread.length === 0 ? (
            <div className="m-auto rounded-3xl bg-white/[0.04] p-5 text-center text-sm text-white/40">
              Henüz mesaj yok. İlk mesajı sen gönder knks 💬
            </div>
          ) : (
            messagesForThread.map((dm) => {
              const mine = String(dm.fromUserId) === String(currentUserId);

              return (
                <div
                  key={dm.id || `${dm.createdAt}-${dm.message}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[82%] rounded-3xl px-4 py-3 ${mine ? "bg-violet-500/25 text-violet-50" : "bg-white/[0.06] text-white/75"}`}>
                    <p className="whitespace-pre-wrap break-words text-sm font-bold leading-5">
                      {dm.message}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-bold text-white/30">
                      <span>
                        {new Date(dm.createdAt || Date.now()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {mine ? (
                        <span
                          className={dm.read || dm.status === "read" ? "text-sky-200/80" : "text-white/35"}
                          title={dm.read || dm.status === "read" ? "Okundu" : "Gönderildi"}
                        >
                          {dm.read || dm.status === "read" ? "✓✓" : "✓"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {dmTypingUser ? (
            <p className="px-2 text-xs font-bold text-sky-200/55">
              {dmTypingUser} yazıyor...
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-3 pb-5 lg:pb-3">
          <div className="flex gap-2">
            <input
              value={dmInput}
              onChange={(event) => {
                setDmInput(event.target.value);
                handleDMTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendDMMessage();
                }
              }}
              placeholder="Mesaj yaz..."
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-sky-300/35"
            />
            <button
              type="button"
              className="btn-primary w-auto px-4"
              onClick={sendDMMessage}
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    );
  }

  function sendPartyInvite(targetUser) {
    if (!roomCode) {
      toast.error("Önce oda oluştur veya odaya gir.");
      return;
    }

    if (!targetUser?.socketId || !targetUser?.isOnline) {
      toast.error("Davet gönderilecek kullanıcı online değil.");
      return;
    }

    if (
      targetUser?.roomCode &&
      String(targetUser.roomCode).toUpperCase() === String(roomCode).toUpperCase()
    ) {
      toast("Zaten aynı odadasınız 👥");
      return;
    }

    const cooldownKey = targetUser.userId || targetUser._id || targetUser.id || targetUser.socketId;
    const cooldownUntil = Number(inviteCooldowns?.[cooldownKey] || 0);

    if (cooldownUntil > Date.now()) {
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      toast.error(`Çok sık davet gönderemezsin. ${remainingSeconds} sn bekle.`);
      return;
    }

    socket.emit(
      "party-invite-send",
      {
        targetSocketId: targetUser.socketId,
        roomCode,
        fromUsername: currentUserPayload.username,
      },
      (response) => {
        if (!response?.ok) {
          if (response?.cooldown && response?.remainingSeconds) {
            setInviteCooldowns((prev) => ({
              ...prev,
              [cooldownKey]: Date.now() + Number(response.remainingSeconds) * 1000,
            }));
          }

          toast.error(response?.message || "Davet gönderilemedi.");
          return;
        }

        setInviteCooldowns((prev) => ({
          ...prev,
          [cooldownKey]: Date.now() + Number(response.cooldownMs || 60000),
        }));

        bumpProfileStat("invitesSent", 1);
        toast.success(response?.message || `${targetUser.username || "Kullanıcı"} davet edildi 🎉`);
      }
    );
  }

  function acceptPartyInvite() {
    if (!partyInvite?.roomCode) return;

    joinRoom(partyInvite.roomCode);
    setPartyInvite(null);
  }

  function rejectPartyInvite() {
    setPartyInvite(null);
  }


  function handleNotificationClick(notification) {
    if (!notification || notification.type !== "dm") return;

    const dmUserId = String(notification.fromUserId || notification.userId || "");

    if (!dmUserId) {
      toast.error("DM bildirimi açılacak kullanıcı bilgisi eksik.");
      return;
    }

    openDM({
      userId: dmUserId,
      _id: dmUserId,
      username:
        notification.fromUsername ||
        notification.username ||
        String(notification.title || "")
          .replace("DM •", "")
          .replace("kişisinden", "")
          .trim() ||
        "Kullanıcı",
    });

    setAppSection("friends");
    setRightPanelTab("people");
    setActiveMobileTab("dm");
  }

  function handleSectionChange(section) {
    const nextSectionMap = {
      room: "settings",
      voice: "watch",
      chat: "watch",
      dm: "friends",
      social: "friends",
    };

    const nextSection = nextSectionMap[section] || section || "watch";

    if (nextSection === "admin" && !isAdminUser) {
      toast.error("Admin panel sadece admin kullanıcıya açık.");
      return;
    }

    setAppSection(nextSection);

    if (section === "chat") {
      setRightPanelTab("chat");
    } else if (section === "voice") {
      setRightPanelTab("people");
    } else if (nextSection === "watch") {
      setRightPanelTab("chat");
    } else if (nextSection === "friends") {
      setRightPanelTab("people");
    }

    setActiveMobileTab(nextSection);
  }

  function changeRoomTheme() {
    setRoomTheme("voryapp");
    toast("VoryApp teması sabit aktif 💜");
  }


  function handleCreateRoomFlow() {
    setAppSection("watch");
    setActiveMobileTab("watch");
    setCreateSheetOpen(true);
    toast("Önce platform seç knks. Oda, YouTube seçilince kurulacak 🎬", { icon: "➕" });
  }

  function selectPlatform(platform) {
    setCreateSheetOpen(false);
    setAppSection("watch");
    setActiveMobileTab("watch");

    if (platform.id === "youtube") {
      if (!roomCode) {
        createRoom();
      }
      toast("YouTube seçildi. Linki yapıştırıp başlat knks ▶️", { icon: "🎬" });
      return;
    }

    toast(`${platform.name} yakında. Şimdilik YouTube/Web akışı aktif.`, { icon: "✨" });
  }

  function renderPlatformSheet() {
    if (!createSheetOpen) return null;

    const platforms = [
      { id: "youtube", name: "YouTube", label: "Aktif", logo: "YouTube" },
      { id: "web", name: "WEB", label: "Yakında", logo: "WEB" },
      { id: "drive", name: "Drive", label: "Yakında", logo: "Drive" },
      { id: "playlist", name: "Playlist", label: "Yakında", logo: "Playlist" },
      { id: "twitch", name: "Twitch", label: "Yakında", logo: "Twitch" },
      { id: "netflix", name: "Netflix", label: "Yakında", logo: "NETFLIX" },
      { id: "prime", name: "Prime", label: "Yakında", logo: "prime" },
      { id: "karaoke", name: "Karaoke", label: "Yakında", logo: "Karaoke" },
    ];

    return (
      <div className="fixed inset-0 z-[9999] overflow-auto bg-[#08000f]/92 px-5 py-6 text-white backdrop-blur-2xl">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-white/8 bg-[#08000f]/80 px-5 py-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-5xl font-black tracking-[-0.08em] text-white drop-shadow-xl">vory</h1>
                <p className="mt-1 text-sm font-bold text-white/45">Platform seç, oda zaten hazır.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateSheetOpen(false)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl font-light text-black shadow-[0_18px_60px_rgba(255,255,255,0.18)]"
                aria-label="Platform ekranını kapat"
              >
                ‹
              </button>
            </div>
          </div>

          <div className="mb-7 flex items-center gap-3 rounded-[1.8rem] bg-black/35 px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <span className="text-4xl leading-none">⌕</span>
            <input
              readOnly
              value="video, dizi veya film ara"
              className="min-w-0 flex-1 bg-transparent text-lg font-black text-white/45 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 pb-28 sm:grid-cols-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => selectPlatform(platform)}
                className="group relative min-h-[110px] rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 text-left shadow-[0_22px_90px_rgba(0,0,0,0.28)] transition hover:scale-[1.02] hover:bg-white/[0.07]"
              >
                <p className="text-3xl font-black tracking-[-0.04em] text-white drop-shadow-xl sm:text-4xl">{platform.logo}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/35">{platform.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRaveHomeFeed() {
    const publicRooms = (discoveryRooms || []).filter((room) => room?.isPublic).slice(0, 8);
    const privatePreview = (discoveryRooms || []).filter((room) => !room?.isPublic).slice(0, 4);
    const demoRooms = publicRooms.length ? publicRooms : [
      { roomCode: "DEMO1", mediaTitle: "YouTube watch party başlat", hostUsername: currentUserPayload.username || "Vory", userCount: Math.max(onlinePresence.length, 1), videoActive: true, demo: true },
      { roomCode: "DEMO2", mediaTitle: "Arkadaşlarınla film gecesi", hostUsername: "Vory", userCount: friendState.friends?.length || 0, demo: true },
    ];

    const RoomCard = ({ room, privateRoom = false }) => (
      <button
        type="button"
        onClick={() => room.demo ? handleCreateRoomFlow() : joinRoom(room.roomCode)}
        className="group grid min-h-[118px] grid-cols-[42%_1fr] overflow-hidden rounded-[1.9rem] bg-black/28 text-left shadow-[0_24px_90px_rgba(0,0,0,0.28)] ring-1 ring-white/8 transition hover:scale-[1.01] hover:ring-white/16"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-500/35 via-fuchsia-500/20 to-sky-500/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.25),transparent_36%)]" />
          <div className="absolute right-3 top-3 rounded-lg bg-white/75 px-2 py-1 text-xs font-black text-black">▶</div>
          <div className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white/80">
            {room.videoActive ? "LIVE" : privateRoom ? "PRIVATE" : "ROOM"}
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-between p-4">
          <div>
            <h3 className="line-clamp-2 text-lg font-black leading-tight text-white sm:text-xl">
              {room.mediaTitle || room.currentMedia?.title || "Vory Watch Party"}
            </h3>
            <p className="mt-1 truncate text-sm font-bold text-white/42">@{room.hostUsername || "host"}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(5, Math.max(1, Number(room.userCount || 1))) }).map((_, index) => (
                <span key={index} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#17051f] bg-white/12 text-xs font-black text-white">
                  {index + 1}
                </span>
              ))}
            </div>
            {Number(room.userCount || 0) > 5 ? <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">+{Number(room.userCount) - 5}</span> : null}
          </div>
        </div>
      </button>
    );

    return (
      <section className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2.3rem] border border-white/8 bg-black/18 p-5 pb-28 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(236,72,153,0.20),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(79,70,229,0.22),transparent_32%),radial-gradient(circle_at_72%_92%,rgba(14,165,233,0.18),transparent_28%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button type="button" onClick={() => handleSectionChange("settings")} className="text-5xl font-black leading-none text-white/90">☰</button>
            <h1 className="text-6xl font-black tracking-[-0.1em] text-white drop-shadow-xl sm:text-7xl">vory</h1>
            <div className="w-14" aria-hidden="true" />
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-[1.9rem] bg-black/40 px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <span className="text-4xl leading-none text-white">⌕</span>
            <input
              placeholder="Oda ara"
              className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-white/45"
              onFocus={() => refreshDiscoveryRooms()}
            />
          </div>

          <div className="space-y-7">
            <div>
              <h2 className="mb-3 flex items-center gap-3 text-3xl font-black text-white"><span>🔒</span> Davetli</h2>
              <div className="space-y-3">
                {(privatePreview.length ? privatePreview : demoRooms.slice(0, 2)).map((room, index) => <RoomCard key={`private-${room.roomCode || index}`} room={room} privateRoom />)}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-3 text-3xl font-black text-white"><span>🌐</span> Herkese Açık</h2>
              <div className="space-y-3">
                {demoRooms.map((room, index) => <RoomCard key={`public-${room.roomCode || index}`} room={room} />)}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
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
    if (!isAdminUser && appSection === "admin") {
      return null;
    }

    if (appSection === "friends") {
      return (
        <div className="vory-v5-page-grid">
          <FriendRequestsPanel
            authUser={authUser}
            friendState={friendState}
            searchQuery={friendSearchQuery}
            setSearchQuery={setFriendSearchQuery}
            searchResults={friendSearchResults}
            loading={friendsLoading}
            onSendRequest={sendFriendRequest}
            onAcceptRequest={acceptFriendRequest}
            onRejectRequest={rejectFriendRequest}
            onRemoveFriend={removeFriend}
          />

          <PresenceFriendPanel
            friendState={friendState}
            onlineUsers={onlinePresence}
            currentSocketId={socket.id}
            currentRoomCode={roomCode}
            activityFeed={activityFeed}
            inviteCooldowns={inviteCooldowns}
            dmUnread={dmUnread}
            activeDM={activeDM}
            dmLastMessages={dmLastMessages}
            onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
            onInviteFriend={sendPartyInvite}
            onOpenDM={openDM}
          />
        </div>
      );
    }

    if (appSection === "discover") {
      return (
        <div className="vory-v5-page-grid">
          <PartyDiscoveryPanel
            rooms={discoveryRooms}
            loading={discoveryLoading}
            currentRoomCode={roomCode}
            isHost={isHost}
            currentRoomPublic={!!roomSettings?.publicRoom}
            onRefresh={refreshDiscoveryRooms}
            onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
            onTogglePublic={togglePublicRoom}
          />
        </div>
      );
    }

    if (appSection === "profile") {
      return (
        <div className="vory-v5-page-grid">
          <ProfileCard
            authUser={authUser}
            roomCode={roomCode}
            connectionStatus={connectionStatus}
            stats={displayProfileStats}
            profileProgress={profileProgress}
            onUserUpdate={(nextUser) => {
              if (nextUser) localStorage.setItem("vory_user", JSON.stringify(nextUser));
            }}
          />
        </div>
      );
    }

    if (appSection === "settings") {
      return (
        <div className="vory-v5-page-grid">
          {renderRoomInviteCard()}
          <InviteBox roomCode={roomCode} />
          <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
        </div>
      );
    }

    if (appSection === "admin") {
      return (
        <div className="vory-v5-page-grid">
          <section className="rounded-[2rem] border border-white/10 bg-black/24 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-fuchsia-200/55">Admin</p>
            <h2 className="mt-1 text-2xl font-black text-white">Feedback</h2>
            <p className="mt-1 text-sm font-bold text-white/40">Kullanıcı geri bildirimleri burada durur.</p>
          </section>
          <AdminFeedbackPanel authUser={authUser} />
        </div>
      );
    }

    if (!roomCode) {
      return renderRaveHomeFeed();
    }

    return (
      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/25 p-2.5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.7rem]">
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
          </div>
        </section>

        {activeVoiceUsers.length > 0 ? (
          <div className="mb-3 rounded-[1.5rem] border border-emerald-300/15 bg-emerald-500/8 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">Seste olanlar</p>
            <div className="flex flex-wrap gap-2">
              {activeVoiceUsers.map((user, index) => (
                <span key={user.id || user.userId || user.username || index} className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 text-xs font-black text-white/80 ring-1 ring-white/10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-100">{String(user.username || user.name || "V").charAt(0).toUpperCase()}</span>
                  {user.username || user.name || "Kullanıcı"}
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                </span>
              ))}
            </div>
          </div>
        ) : null}

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
          onVoteMedia={voteMedia}
          messages={messages}
          message={message}
          setMessage={setMessage}
          onSendMessage={sendMessage}
          users={users}
          onlinePresence={onlinePresence}
          currentSocketId={socket.id}
          currentRoomCode={roomCode}
          inviteCooldowns={inviteCooldowns}
          dmUnread={dmUnread}
          activeDM={activeDM}
          dmLastMessages={dmLastMessages}
          onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
          onInviteFriend={sendPartyInvite}
          onOpenDM={openDM}
        />

        <div className="xl:col-span-2">
          <VoiceChat roomCode={roomCode} username={currentUserPayload.username} onReaction={sendReaction} />
        </div>
      </div>
    );
  }

  function renderMobilePanel() {
    const mobileSectionMap = {
      room: "settings",
      voice: "watch",
      chat: "watch",
      dm: "friends",
      social: "friends",
      admin: "settings",
    };
    const mobileSection = mobileSectionMap[activeMobileTab] || activeMobileTab || "watch";

    if (mobileSection === "watch") {
      if (!roomCode) {
        return (
          <section className="pb-28">
            {renderRaveHomeFeed()}
          </section>
        );
      }

      return (
        <section className="flex min-w-0 flex-col gap-4 pb-28">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMobileQueueOpen(true)}
              className="rounded-[1.75rem] border border-violet-300/15 bg-violet-500/10 p-4 text-left shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200/55">
                Watch Queue
              </p>
              <h2 className="mt-2 truncate text-lg font-black text-white">
                {currentMedia?.title || "Queue hazır"}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/45">
                {mediaQueue.length ? `${mediaQueue.length} medya sırada` : "Sırada medya yok"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMobileQueueOpen(false)}
              className="rounded-[1.75rem] border border-sky-300/15 bg-sky-500/10 p-4 text-left shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200/55">
                Room Status
              </p>
              <h2 className="mt-2 truncate text-lg font-black text-white">
                {roomCode ? `Room ${roomCode}` : "Lobby"}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/45">
                👥 {users.length || onlinePresence.length} kişi • 🎤 {liveVoiceCount} voice
              </p>
            </button>
          </div>

          {activeVoiceUsers.length > 0 ? (
          <div className="mb-3 rounded-[1.5rem] border border-emerald-300/15 bg-emerald-500/8 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">Seste olanlar</p>
            <div className="flex flex-wrap gap-2">
                {activeVoiceUsers.map((user, index) => (
                <span key={user.id || user.userId || user.username || index} className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 text-xs font-black text-white/80 ring-1 ring-white/10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-100">{String(user.username || user.name || "V").charAt(0).toUpperCase()}</span>
                    {user.username || user.name || "Kullanıcı"}
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                </span>
              ))}
            </div>
          </div>
        ) : null}

          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={sendMessage}
            typingUser={typingUser}
            onTyping={handleTyping}
          />

          <VoiceChat roomCode={roomCode} username={currentUserPayload.username} onReaction={sendReaction} />

          {mobileQueueOpen && (
            <div className="fixed inset-0 z-[9997] flex items-end bg-black/55 backdrop-blur-sm lg:hidden">
              <button
                type="button"
                aria-label="Queue kapat"
                className="absolute inset-0"
                onClick={() => setMobileQueueOpen(false)}
              />

              <div className="relative max-h-[82vh] w-full overflow-auto rounded-t-[2rem] border border-white/10 bg-[#070712] p-3 pb-6 shadow-[0_-24px_90px_rgba(0,0,0,0.65)]">
                <div className="sticky top-0 z-10 mb-3 rounded-[1.5rem] border border-white/10 bg-black/70 p-3 backdrop-blur-2xl">
                  <div className="mx-auto mb-3 h-1 w-14 rounded-full bg-white/25" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200/55">
                        Mobile Watch Queue
                      </p>
                      <h2 className="mt-1 truncate text-lg font-black text-white">
                        {currentMedia?.title || "Media Queue"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileQueueOpen(false)}
                      className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white/70"
                    >
                      Kapat
                    </button>
                  </div>
                </div>

                <MediaQueue
                  roomCode={roomCode}
                  isHost={isHost}
                  currentMedia={currentMedia}
                  queue={mediaQueue}
                  onAdd={addToQueue}
                  onPlayNext={playNextMedia}
                  onRemove={removeFromQueue}
                  onClear={clearMediaQueue}
                  onVote={voteMedia}
                  currentUserId={currentUserId || socket.id}
                  defaultOpen
                />
              </div>
            </div>
          )}
        </section>
      );
    }

    if (mobileSection === "friends") {
      return (
        <section className="flex min-w-0 flex-col gap-4 pb-28">
          <FriendRequestsPanel
            authUser={authUser}
            friendState={friendState}
            searchQuery={friendSearchQuery}
            setSearchQuery={setFriendSearchQuery}
            searchResults={friendSearchResults}
            loading={friendsLoading}
            onSendRequest={sendFriendRequest}
            onAcceptRequest={acceptFriendRequest}
            onRejectRequest={rejectFriendRequest}
            onRemoveFriend={removeFriend}
          />
          <PresenceFriendPanel
            friendState={friendState}
            onlineUsers={onlinePresence}
            currentSocketId={socket.id}
            currentRoomCode={roomCode}
            inviteCooldowns={inviteCooldowns}
            dmUnread={dmUnread}
            activeDM={activeDM}
            dmLastMessages={dmLastMessages}
            onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
            onInviteFriend={sendPartyInvite}
            onOpenDM={openDM}
          />
        </section>
      );
    }

    if (mobileSection === "discover") {
      return (
        <section className="flex min-w-0 flex-col gap-4 pb-28">
          <PartyDiscoveryPanel
            rooms={discoveryRooms}
            loading={discoveryLoading}
            currentRoomCode={roomCode}
            isHost={isHost}
            currentRoomPublic={!!roomSettings?.publicRoom}
            onRefresh={refreshDiscoveryRooms}
            onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
            onTogglePublic={togglePublicRoom}
          />
        </section>
      );
    }

    if (mobileSection === "screen") {
      return (
        <section className="flex min-w-0 flex-col gap-4 pb-28">
          <div className="rounded-[1.75rem] border border-emerald-300/15 bg-emerald-400/[0.06] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-200/60">
              Mobile Screen Viewer
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {roomCode ? "Ekran Yayını" : "Önce odaya gir"}
            </h2>
            <p className="mt-1 text-sm font-bold text-white/42">
              Mobilde ekran paylaşımı başlatmak yerine PC’den açılan yayını izleyebilirsin.
            </p>
          </div>

          <ScreenShare
            roomCode={roomCode}
            username={currentUserPayload.username}
          />
        </section>
      );
    }

    if (mobileSection === "profile") {
      return (
        <section className="flex min-w-0 flex-col gap-4 pb-28">
          <ProfileCard
            authUser={authUser}
            roomCode={roomCode}
            connectionStatus={connectionStatus}
            stats={displayProfileStats}
            profileProgress={profileProgress}
            onUserUpdate={(nextUser) => {
              if (nextUser) localStorage.setItem("vory_user", JSON.stringify(nextUser));
            }}
          />
        </section>
      );
    }

    return (
      <section className="flex min-w-0 flex-col gap-4 pb-28">
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

  return (
    <div className={`app-shell theme-voryapp min-h-screen overflow-x-hidden bg-gradient-to-br ${getThemeShellClass()} text-white`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-32 top-0 h-96 w-96 rounded-full ${getThemeGlowClass(1)} blur-3xl`} />
        <div className={`absolute right-10 top-20 h-96 w-96 rounded-full ${getThemeGlowClass(2)} blur-3xl`} />
        <div className={`absolute bottom-0 left-1/2 h-96 w-96 rounded-full ${getThemeGlowClass(3)} blur-3xl`} />
      </div>

      <div className="relative flex min-h-screen gap-3 p-3 pb-24 sm:p-4 sm:pb-24 lg:gap-3 lg:p-3 xl:gap-4 xl:p-4">
        <VorySidebar
          activeSection={appSection}
          onChange={handleSectionChange}
          roomCode={roomCode}
          onlineCount={onlinePresence.length}
          userCount={users.length}
          isAdmin={isAdminUser}
          authUser={authUser}
          onLogout={handleLogoutCleanup}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <VoryTopBar
            authUser={authUser}
            onLogout={handleLogoutCleanup}
            isHost={isHost}
            roomCode={roomCode}
            onLeaveRoom={leaveRoom}
            userCount={users.length}
            watchingCount={liveWatchingCount}
            voiceCount={liveVoiceCount}
            screenCount={liveScreenCount}
            connectionStatus={connectionStatus}
            lastRestoreMessage={lastRestoreMessage}
            hostTransferMessage={hostTransferMessage}
            onRestore={() => restorePreviousSession("manual-click")}
            notifications={notifications}
            onMarkNotificationsRead={markNotificationsRead}
            onClearNotifications={clearNotifications}
            onNotificationClick={handleNotificationClick}
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

          {(pendingInviteRoom || lastRestoreMessage) && !roomCode && (
            <div className="glass-panel flex flex-col gap-4 border-emerald-400/25 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300/70">
                  {pendingInviteRoom ? "Room Link Algılandı" : "Room Link Aktif Değil"}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {pendingInviteRoom
                    ? `${pendingInviteRoom} odasına yönlendiriliyorsun`
                    : "Bu oda artık aktif değil"}
                </h2>
                {!pendingInviteRoom && lastRestoreMessage ? (
                  <p className="mt-1 text-sm font-bold text-white/45">
                    {lastRestoreMessage}
                  </p>
                ) : null}
              </div>

              {pendingInviteRoom ? (
                <button className="btn-primary w-full sm:w-auto" onClick={joinPendingInvite}>
                  Tekrar Katıl
                </button>
              ) : null}
            </div>
          )}

          <main className="hidden min-h-0 flex-1 lg:block">
            <div className="relative">
              {renderDesktopMain()}

              {appSection === "watch" && (
                <ReactionBurst reactions={reactions} />
              )}
            </div>

            {appSection === "watch" && !roomCode && (
              <button
                type="button"
                onClick={handleCreateRoomFlow}
                className="vory-rave-create-fab"
                title="Oda oluştur"
                aria-label="Oda oluştur"
              >
                +
              </button>
            )}

            {appSection === "watch" && !roomCode && (
              <VoryBottomDock
                roomCode={roomCode}
                isHost={isHost}
                onOpenRoom={() => handleSectionChange("settings")}
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

          {renderDMPanel()}
          {renderPlatformSheet()}


          {!roomCode && (
            <button
              type="button"
              onClick={handleCreateRoomFlow}
              className="vory-rave-create-fab lg:hidden"
              title="Oda oluştur"
              aria-label="Oda oluştur"
            >
              +
            </button>
          )}

          <FeedbackWidget
            authUser={authUser}
            roomCode={roomCode}
            connectionStatus={connectionStatus}
          />

          <MobileBottomNav
            activeTab={activeMobileTab}
            onChange={handleSectionChange}
            unreadMessages={messages.length}
            dmUnreadCount={totalDmUnread}
            onlineCount={onlinePresence.length}
            roomCode={roomCode}
            onLogout={handleLogoutCleanup}
          />
        </div>
      </div>
    </div>
  );
}
