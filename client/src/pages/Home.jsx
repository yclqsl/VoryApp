import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";
import VorySidebar from "../components/VorySidebar";
import VoryTopBar from "../components/VoryTopBar";
import VoryRightPanel from "../components/VoryRightPanel";
import VoryBottomDock from "../components/VoryBottomDock";
import ReactionBurst from "../components/ReactionBurst";
import MediaQueue from "../components/MediaQueue";
import QuickActions from "../components/QuickActions";
import RoomPanel from "../components/RoomPanel";
import AnimatedBackground from "../components/AnimatedBackground";
import InviteBox from "../components/InviteBox";
import PresenceFriendPanel from "../components/PresenceFriendPanel";
import UserList from "../components/UserList";
import ChatPanel from "../components/ChatPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProfileCard from "../components/ProfileCard";
import VoiceChat from "../components/VoiceChat";
import MobileBottomNav from "../components/MobileBottomNav";
import AdminFeedbackPanel from "../components/AdminFeedbackPanel";
import FeedbackWidget from "../components/FeedbackWidget";
import FriendRequestsPanel from "../components/FriendRequestsPanel";
import { api } from "../services/api";


function isRoomReloadNavigation() {
  if (typeof window === "undefined") return false;

  const navigationEntry = window.performance?.getEntriesByType?.("navigation")?.[0];
  const legacyReload = window.performance?.navigation?.type === 1;

  return navigationEntry?.type === "reload" || legacyReload;
}

function hardRedirectRoomReloadToLobby() {
  if (typeof window === "undefined") return false;

  const isRoomPath = /^\/room\//i.test(window.location.pathname || "");

  if (isRoomPath && isRoomReloadNavigation()) {
    window.history.replaceState({}, "", "/");
    window.location.replace("/");
    return true;
  }

  return false;
}

function getRoomCodeFromLocation() {
  if (hardRedirectRoomReloadToLobby()) return "";
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

function detectVoryPerformanceMode() {
  if (typeof window === "undefined") return false;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!connection?.saveData;
  const lowBandwidth = /2g/.test(String(connection?.effectiveType || "").toLowerCase());
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
  const lowCores = Number(navigator.hardwareConcurrency || 8) <= 4;

  return Boolean(reduceMotion || saveData || lowBandwidth || lowMemory || lowCores);
}




function isMobileSyncViewer() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 900;
}

function getMobileSyncCompensationSeconds() {
  if (typeof window === "undefined") return 0;
  return isMobileSyncViewer() ? 0.22 : 0;
}

function normalizeYouTubeSearchQuery(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getYouTubeSearchCacheKey(query = "", tab = "home", pageToken = "") {
  const cleanQuery = normalizeYouTubeSearchQuery(query).toLowerCase();
  const cleanTab = tab === "shorts" ? "shorts" : "home";
  return `${cleanTab}:${cleanQuery}:${String(pageToken || "")}`;
}

const YOUTUBE_CLIENT_CACHE_TTL_MS = 6 * 60 * 1000;
const YOUTUBE_SEARCH_RETRY_DELAY_MS = 1350;

function isYouTubeSearchThrottleError(error) {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();

  return (
    status === 429 ||
    message.includes("çok hızlı") ||
    message.includes("too fast") ||
    message.includes("rate")
  );
}


export default function Home({ authUser, onLogout }) {
  const [username, setUsername] = useState(authUser?.username || "");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomTheme, setRoomTheme] = useState("voryapp");
  const [roomSettings, setRoomSettings] = useState({ publicRoom: false });
  const [discoveryRooms, setDiscoveryRooms] = useState([]);
  const [invitedDiscoveryRooms, setInvitedDiscoveryRooms] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [voiceRoster, setVoiceRoster] = useState([]);
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
  const [youtubeBrowserOpen, setYoutubeBrowserOpen] = useState(false);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [youtubeRoomCreating, setYoutubeRoomCreating] = useState(false);
  const [youtubeNextPageToken, setYoutubeNextPageToken] = useState("");
  const [youtubeLoadingMore, setYoutubeLoadingMore] = useState(false);
  const [youtubeTab, setYoutubeTab] = useState("home");
  const [youtubeRecentSearches, setYoutubeRecentSearches] = useState(() =>
    readLocalJson("vory-youtube-recent-searches", [])
  );
  const [youtubeSelectedVideo, setYoutubeSelectedVideo] = useState(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [performanceMode] = useState(() => detectVoryPerformanceMode());
  const [discoveryRenderLimit, setDiscoveryRenderLimit] = useState(() => (detectVoryPerformanceMode() ? 6 : 12));
  const [roomInvitePanelOpen, setRoomInvitePanelOpen] = useState(false);
  const [fullscreenChatToast, setFullscreenChatToast] = useState(null);
  const [syncQuality, setSyncQuality] = useState({
    status: "idle",
    label: "Sync waiting",
    drift: 0,
    detail: "Waiting for video sync",
    updatedAt: 0,
  });


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
  const activeVoiceUsers = roomCode ? voiceRoster : [];
  const liveVoiceCount = activeVoiceUsers.length;

  function isFullscreenPlaybackActive() {
    if (typeof document === "undefined" || typeof window === "undefined") return false;

    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (window.innerHeight >= window.screen.height - 4 && window.innerWidth >= window.screen.width - 4)
    );
  }

  function showFullscreenChatToast(chatMessage) {
    // Toast state'i her zaman set edilsin; görünürlük kararını VideoPlayer fullscreen shell versin.
    if (!chatMessage || !roomCode || !videoUrl) return;

    setFullscreenChatToast({
      id: chatMessage.id || `${Date.now()}-${Math.random()}`,
      sender: chatMessage.sender || "Misafir",
      message: chatMessage.message || "",
      avatar: chatMessage.avatar || "",
    });

    window.clearTimeout(window.__voryFullscreenChatToastTimer);
    window.__voryFullscreenChatToastTimer = window.setTimeout(() => {
      setFullscreenChatToast(null);
    }, 3400);
  }


  function updateSyncQuality({ drift = 0, soft = false, reason = "" } = {}) {
    const safeDrift = Math.max(0, Number(drift) || 0);
    const nextStatus =
      // Vory 5.5.3C: mobile YouTube iframe için 0.4-0.5s drift normal band; Synced kabul edilir.
      safeDrift <= 0.6
        ? "synced"
        : safeDrift <= 1.1
          ? "slight"
          : "resyncing";

    const nextLabel =
      nextStatus === "synced"
        ? "Synced"
        : nextStatus === "slight"
          ? "Slight delay"
          : "Resyncing";

    const nextDetail =
      nextStatus === "synced"
        ? "Video is locked"
        : nextStatus === "slight"
          ? `${safeDrift.toFixed(1)}s drift`
          : `Fixing ${safeDrift.toFixed(1)}s drift`;

    setSyncQuality((prev) => {
      const previousStatus = prev?.status || "";
      const previousDrift = Number(prev?.drift || 0);
      const driftChanged = Math.abs(previousDrift - safeDrift) > 0.08;

      if (
        previousStatus === nextStatus &&
        !driftChanged &&
        Date.now() - Number(prev?.updatedAt || 0) < 1200
      ) {
        return prev;
      }

      return {
        status: nextStatus,
        label: nextLabel,
        drift: safeDrift,
        detail: nextDetail,
        soft: !!soft,
        reason,
        updatedAt: Date.now(),
      };
    });
  }


  function maybeAutoSyncStabilize({ drift = 0, targetTime = 0, isPlaying = false, localState = -1, soft = false } = {}) {
    if (isHost || !roomCode || !playerRef.current || !isPlaying) return false;

    const safeDrift = Math.max(0, Number(drift) || 0);
    const now = Date.now();

    const mobileViewer = isMobileSyncViewer();
    const microStutterGuard = mobileViewer ? 1.55 : 1.70;

    // Mobilde/desktopta küçük driftler normaldir. Bunlara seek atmak video
    // "duraklayıp devam ediyor" hissini oluşturuyordu.
    if (safeDrift < microStutterGuard || now < Number(autoSyncQuietUntilRef.current || 0)) {
      return false;
    }

    const cooldown = mobileViewer ? 3600 : 4400;
    if (now - Number(autoSyncStabilizerRef.current || 0) < cooldown) {
      return false;
    }

    autoSyncStabilizerRef.current = now;
    autoSyncQuietUntilRef.current = now + (mobileViewer ? 2600 : 3200);

    updateSyncQuality({
      drift: safeDrift,
      soft: true,
      reason: "auto-stabilizer",
    });

    try {
      const nextTarget = Math.max(0, Number(targetTime) || 0);

      // Sadece gerçek kopmada tek seek. Mikro driftte hiç müdahale etme.
      const canMicroSeek = mobileViewer ? safeDrift >= 1.55 && safeDrift < 2.80 : safeDrift >= 1.70 && safeDrift < 2.80;
      if (canMicroSeek) {
        ignoreEventRef.current = true;
        playerRef.current.seekTo?.(nextTarget, true);

        if (localState !== 1) {
          playerRef.current.playVideo?.();
        }

        setTimeout(() => {
          ignoreEventRef.current = false;
        }, soft ? 420 : 340);

        return true;
      }

      // Force-sync spam'i daha fazla sync paketi üretip stutter yapabiliyor.
      // Çok büyük driftte bile önce local calm seek yeterli; server heartbeat gerisini toplar.
      return false;
    } catch {
      ignoreEventRef.current = false;
      return false;
    }
  }


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


  const roomInviteFriends = useMemo(() => {
    const onlineById = new Map(
      (onlinePresence || [])
        .filter((user) => user?.userId && user?.socketId)
        .map((user) => [String(user.userId), user])
    );

    return (friendState.friends || [])
      .map((friend) => {
        const friendId = String(friend?._id || friend?.id || friend?.userId || "");
        const presence = onlineById.get(friendId);

        return {
          ...friend,
          userId: friendId,
          socketId: presence?.socketId || "",
          isOnline: !!presence?.socketId,
          roomCode: presence?.roomCode || "",
          username: friend?.username || presence?.username || "Kullanıcı",
          avatar: friend?.avatar || presence?.avatar || "",
        };
      })
      .filter((friend) => friend.isOnline);
  }, [friendState.friends, onlinePresence]);


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
      // Vory 5.5.3E.10.3:
      // F5 / token restore / Render cold-start sırasında friend endpoint kısa süre hata verebiliyor.
      // Bu kullanıcı aksiyonlu bir hata olmadığı için sağ üst toast basmıyoruz.
      // Mevcut friend state korunur, UI sessiz fallback ile devam eder.
      if (!isUnauthorizedError(error)) {
        console.warn("Friend state sessiz fallback:", error?.response?.status || error?.message || error);
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
    if (!youtubeBrowserOpen) return;

    const query = normalizeYouTubeSearchQuery(youtubeSearchQuery);
    const cacheKey = getYouTubeSearchCacheKey(query, youtubeTab);

    if (query.length < 3) {
      youtubeLastSearchKeyRef.current = "";
      setYoutubeResults([]);
      setYoutubeError("");
      setYoutubeNextPageToken("");
      setYoutubeLoading(false);
      return;
    }

    const cached = youtubeSearchCacheRef.current.get(cacheKey);
    if (cached && Date.now() - Number(cached.cachedAt || 0) < YOUTUBE_CLIENT_CACHE_TTL_MS) {
      youtubeLastSearchKeyRef.current = cacheKey;
      setYoutubeResults(cached.items || []);
      setYoutubeNextPageToken(cached.nextPageToken || "");
      setYoutubeError("");
      setYoutubeLoading(false);
      return;
    }

    if (youtubeLastSearchKeyRef.current === cacheKey && youtubeLoading) return;

    const requestId = youtubeSearchRequestIdRef.current + 1;
    youtubeSearchRequestIdRef.current = requestId;

    async function runYoutubeSearch({ retry = false } = {}) {
      if (youtubeSearchRequestIdRef.current !== requestId) return;

      const cooldownLeft = Number(youtubeSearchCooldownUntilRef.current || 0) - Date.now();
      if (!retry && cooldownLeft > 0) {
        window.clearTimeout(youtubeSearchRetryTimerRef.current);
        youtubeSearchRetryTimerRef.current = window.setTimeout(() => {
          runYoutubeSearch({ retry: true });
        }, Math.max(350, cooldownLeft + 120));
        return;
      }

      try {
        youtubeLastSearchKeyRef.current = cacheKey;
        setYoutubeLoading(true);
        setYoutubeError("");

        const response = await api.get("/youtube/search", {
          params: {
            q: query,
            maxResults: youtubeTab === "shorts" ? 10 : 10,
            shorts: youtubeTab === "shorts" ? "1" : "",
          },
        });

        if (youtubeSearchRequestIdRef.current !== requestId) return;

        const nextItems = response.data?.items || [];
        const nextPageToken = response.data?.nextPageToken || "";

        youtubeSearchCacheRef.current.set(cacheKey, {
          items: nextItems,
          nextPageToken,
          cachedAt: Date.now(),
        });

        setYoutubeResults(nextItems);
        setYoutubeNextPageToken(nextPageToken);
        youtubeSearchCooldownUntilRef.current = 0;
      } catch (error) {
        if (youtubeSearchRequestIdRef.current !== requestId) return;

        if (isYouTubeSearchThrottleError(error)) {
          // Vory 5.5.3E.11.1:
          // YouTube tab/input remount aynı sorguyu art arda tetikleyebiliyor.
          // Bunu kullanıcıya hata gibi göstermiyoruz; sessizce kısa cooldown sonrası tekrar deniyoruz.
          youtubeSearchCooldownUntilRef.current = Date.now() + YOUTUBE_SEARCH_RETRY_DELAY_MS;
          setYoutubeError("");

          if (!retry) {
            window.clearTimeout(youtubeSearchRetryTimerRef.current);
            youtubeSearchRetryTimerRef.current = window.setTimeout(() => {
              runYoutubeSearch({ retry: true });
            }, YOUTUBE_SEARCH_RETRY_DELAY_MS);
          }
          return;
        }

        console.error("YouTube search error:", error);
        setYoutubeError(error?.response?.data?.message || "YouTube araması yapılamadı.");
        setYoutubeResults([]);
        setYoutubeNextPageToken("");
      } finally {
        if (youtubeSearchRequestIdRef.current === requestId) {
          setYoutubeLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      runYoutubeSearch();
    }, 1100);

    return () => {
      clearTimeout(timer);
      window.clearTimeout(youtubeSearchRetryTimerRef.current);
    };
  }, [youtubeBrowserOpen, youtubeSearchQuery, youtubeTab]);

  useEffect(() => {
    if (!youtubeBrowserOpen) return;

    const sentinel = youtubeFeedSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry?.isIntersecting &&
          youtubeNextPageToken &&
          !youtubeLoading &&
          !youtubeLoadingMore &&
          youtubeResults.length > 0
        ) {
          loadMoreYoutubeResults();
        }
      },
      {
        root: null,
        rootMargin: "520px 0px 520px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    youtubeBrowserOpen,
    youtubeNextPageToken,
    youtubeLoading,
    youtubeLoadingMore,
    youtubeResults.length,
    youtubeTab,
    youtubeSearchQuery,
  ]);

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
    if (!currentUserId) {
      setDiscoveryLoading(false);
      return undefined;
    }

    socket.emit("get-discovery-rooms");

    // Vory 5.5.3E.11.7:
    // Discovery socket cevabı Render cold-start / reconnect sırasında gecikirse
    // lobby "Aktif odalar yükleniyor" ekranında kilitli kalmasın.
    const fallbackTimer = window.setTimeout(() => {
      setDiscoveryLoading(false);
      socket.emit("get-discovery-rooms");
    }, 1400);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [currentUserId, connectionStatus]);


  useEffect(() => {
    if (!currentUserId) return undefined;

    const markOffline = (event) => {
      try {
        const isPageHide = event?.type === "pagehide";

        // Vory 5.5.3E.10.8:
        // Mobil app alta alma / tab background / WebRTC geçişlerinde beforeunload-pagehide ikilisi
        // bazen gerçek çıkış gibi çalışıyordu. Voice veya media aktifken kullanıcıyı odadan düşürmüyoruz.
        const shouldKeepMediaSession =
          roomCode &&
          (isPageHide ||
            document.visibilityState === "hidden" ||
            isVoryMediaPauseProtected() ||
            window.__voryVoiceSessionWanted);

        if (shouldKeepMediaSession) {
          markVoryMediaProtected(45000);
          socket.emit("user-background", {
            userId: currentUserIdRef.current || currentUserId,
            roomCode,
          });
          socket.emit("media-background-keepalive", {
            roomCode,
            videoUrl,
            voiceWanted: !!window.__voryVoiceSessionWanted,
          });
          return;
        }

        socket.emit("user-logout", { userId: currentUserIdRef.current || currentUserId });
        if (roomCode) {
          try {
            window.dispatchEvent(new CustomEvent("vory-force-voice-leave"));
          } catch {}
          socket.emit("leave-room", { roomCode });
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      try {
        if (document.visibilityState === "hidden") {
          socket.emit("user-background", {
            userId: currentUserIdRef.current || currentUserId,
            roomCode,
          });

          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = videoUrl ? "playing" : "none";
          }

          try {
            markVoryMediaProtected(45000);
            socket.emit("media-background-keepalive", {
              roomCode,
              videoUrl,
              voiceWanted: !!window.__voryVoiceSessionWanted,
            });
          } catch {}
          return;
        }

        socket.emit("user-online", {
          userId: currentUserIdRef.current || currentUserId,
          username: currentUserPayload.username,
          avatar: authUser?.avatar || "",
        });

        if (roomCode) {
          markVoryRoomRestore(22000);
          socket.emit("join-room", {
            roomCode,
            username: currentUserPayload.username,
            userId: currentUserIdRef.current || currentUserId,
            avatar: authUser?.avatar || "",
            restore: true,
          });
          socket.emit("force-video-sync", { roomCode, reason: "visibility-restore" });
          socket.emit("get-voice-users", { roomCode });
          try {
            markVoryMediaProtected(20000);
            if (window.__voryVoiceSessionWanted) {
              socket.emit("voice-join", {
                roomCode,
                username: currentUserPayload.username,
                restore: true,
              });
            }
          } catch {}
        }
      } catch {}
    };

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", markOffline);
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, roomCode, currentUserPayload.username, authUser?.avatar, videoUrl]);

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
    writeLocalJson("vory-youtube-recent-searches", youtubeRecentSearches);
  }, [youtubeRecentSearches]);

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
  const lastClientSyncEmitRef = useRef(0);
  const localVoiceActiveRef = useRef(false);
  const pulseLockRef = useRef(false);
  const lastSoftSyncRef = useRef(0);
  const autoSyncStabilizerRef = useRef(0);
  const autoSyncQuietUntilRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const activeDMRef = useRef(null);
  const currentUserIdRef = useRef(currentUserId);
  const roomUsersRef = useRef([]);
  const pendingResumeRef = useRef(null);
  const pendingYoutubeVideoRef = useRef(null);
  const pendingYoutubeQueueRef = useRef(null);
  const pendingSyncStateRef = useRef(null);
  const youtubeFeedSentinelRef = useRef(null);
  const youtubeSearchCacheRef = useRef(new Map());
  const youtubeSearchRequestIdRef = useRef(0);
  const youtubeLastSearchKeyRef = useRef("");
  const youtubeLastLoadMoreKeyRef = useRef("");
  const youtubeSearchCooldownUntilRef = useRef(0);
  const youtubeSearchRetryTimerRef = useRef(null);
  const presenceSignatureRef = useRef("");
  const discoverySignatureRef = useRef("");
  const voryToastDedupeRef = useRef(new Map());
  const currentVideoUrlRef = useRef("");
  const currentRoomCodeRef = useRef("");

  useEffect(() => {
    currentVideoUrlRef.current = String(videoUrl || "").trim();
  }, [videoUrl]);

  useEffect(() => {
    currentRoomCodeRef.current = String(roomCode || "").trim().toUpperCase();
  }, [roomCode]);



  function applySyncState({ isPlaying, currentTime, soft = false } = {}) {
    window.__voryLatestSyncState = {
      isPlaying: !!isPlaying,
      currentTime: Math.max(0, Number(currentTime) || 0),
      updatedAt: Date.now(),
    };

    if (!playerRef.current) {
      pendingSyncStateRef.current = { isPlaying, currentTime, soft };
      return;
    }

    const mobileViewer = !isHost && isMobileSyncViewer();
    const compensation = !isHost && isPlaying ? getMobileSyncCompensationSeconds() : 0;
    const targetTime = Math.max(0, (Number(currentTime) || 0) + compensation);
    const localTime = playerRef.current.getCurrentTime?.() || 0;
    const localState = playerRef.current.getPlayerState?.();
    const drift = Math.abs(localTime - targetTime);
    const now = Date.now();

    updateSyncQuality({
      drift,
      soft,
      reason: soft ? "soft-sync" : "hard-sync",
    });

    // Vory 5.5.3E.13.5:
    // YouTube iframe stutter came from correcting sub-second drift too often.
    // Rave-like sync should be tolerant: only seek on real desync, not micro drift.
    const softDriftThreshold = mobileViewer ? 1.15 : (compensation ? 1.10 : 1.30);
    const hardDriftThreshold = mobileViewer ? 1.75 : (compensation ? 1.70 : 2.00);
    const softCooldown = mobileViewer ? 2600 : (compensation ? 2800 : 3200);

    const autoStabilized = maybeAutoSyncStabilize({
      drift,
      targetTime,
      isPlaying,
      localState,
      soft,
    });

    if (autoStabilized) return;

    if (soft) {
      if (drift > softDriftThreshold && now - lastSoftSyncRef.current > softCooldown) {
        lastSoftSyncRef.current = now;
        ignoreEventRef.current = true;
        playerRef.current.seekTo(targetTime, true);

        if (isPlaying && localState !== 1) {
          playerRef.current.playVideo?.();
        }

        setTimeout(() => {
          ignoreEventRef.current = false;
        }, 450);
      }

      if (isPlaying && localState !== 1 && !isVoryMediaPauseProtected()) {
        try {
          ignoreEventRef.current = true;
          playerRef.current.playVideo?.();
          setTimeout(() => {
            ignoreEventRef.current = false;
          }, 360);
        } catch {
          ignoreEventRef.current = false;
        }
      }

      return;
    }

    const shouldSeekHard = drift > hardDriftThreshold;
    const shouldPlay = isPlaying && localState !== 1;
    const shouldPause = !isPlaying && localState !== 2 && !isVoryMediaPauseProtected();

    if (!shouldSeekHard && !shouldPlay && !shouldPause) {
      return;
    }

    ignoreEventRef.current = true;

    if (shouldSeekHard) {
      playerRef.current.seekTo(targetTime, true);
    }

    if (shouldPlay) {
      playerRef.current.playVideo?.();
    } else if (shouldPause) {
      playerRef.current.pauseVideo?.();
    }

    setTimeout(() => {
      ignoreEventRef.current = false;
    }, shouldSeekHard ? 760 : 420);
  }
  function showVoryToastOnce(key, message, options = {}) {
    const safeKey = String(key || message || "toast");
    const now = Date.now();
    const ttl = Number(options.ttl || 9000);
    const lastAt = Number(voryToastDedupeRef.current.get(safeKey) || 0);

    if (lastAt && now - lastAt < ttl) return;

    try {
      const sessionKey = `vory-toast:${safeKey}`;
      const storedAt = Number(sessionStorage.getItem(sessionKey) || 0);
      if (storedAt && now - storedAt < ttl) return;
      sessionStorage.setItem(sessionKey, String(now));
    } catch {}

    voryToastDedupeRef.current.set(safeKey, now);

    if (options.success) {
      toast.success(message);
      return;
    }

    toast(message, options.toastOptions || {});
  }


  function isVoryMediaPauseProtected() {
    try {
      const now = Date.now();
      return Boolean(
        now < Number(window.__voryVoiceTransitionUntil || 0) + 14000 ||
          now < Number(window.__voryMediaPersistUntil || 0) ||
          now < Number(window.__voryMediaGuardUntil || 0) ||
          window.__voryVoiceSessionWanted ||
          document.visibilityState === "hidden"
      );
    } catch {
      return false;
    }
  }

  function markVoryMediaProtected(ms = 30000) {
    try {
      const until = Date.now() + Number(ms || 30000);
      window.__voryMediaGuardUntil = Math.max(Number(window.__voryMediaGuardUntil || 0), until);
      window.__voryMediaPersistUntil = Math.max(Number(window.__voryMediaPersistUntil || 0), until);
    } catch {}
  }

  function markVoryRoomRestore(ms = 18000) {
    try {
      window.__voryRoomRestoreUntil = Math.max(
        Number(window.__voryRoomRestoreUntil || 0),
        Date.now() + Number(ms || 18000)
      );
    } catch {}
  }

  function isVoryRoomRestoreActive() {
    try {
      return Date.now() < Number(window.__voryRoomRestoreUntil || 0);
    } catch {
      return false;
    }
  }

  function isJoinRestoreMessage(message = "") {
    const clean = String(message || "").toLowerCase();
    return clean.includes("odaya katıldı") || clean.includes("odaya katıldın") || clean.includes("joined room") || clean.includes("joined the room");
  }

  useEffect(() => {
    const syncViewportMode = () => {
      setIsDesktopViewport(window.innerWidth >= 1024);
    };

    syncViewportMode();
    window.addEventListener("resize", syncViewportMode);

    return () => window.removeEventListener("resize", syncViewportMode);
  }, []);


  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.documentElement.classList.toggle("vory-performance-mode", performanceMode);
    document.body.classList.toggle("vory-performance-mode", performanceMode);

    return () => {
      document.documentElement.classList.remove("vory-performance-mode");
      document.body.classList.remove("vory-performance-mode");
    };
  }, [performanceMode]);


  useEffect(() => {
    if (roomCode || appSection !== "watch") return;
    setDiscoveryRenderLimit(performanceMode ? 6 : 12);
  }, [performanceMode, roomCode, appSection]);

  useEffect(() => {
    activeDMRef.current = activeDM;
  }, [activeDM]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    roomUsersRef.current = users || [];
  }, [users]);

  useEffect(() => {
    hardRedirectRoomReloadToLobby();
  }, []);

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

        try {
          markVoryMediaProtected(20000);
          socket.emit("media-background-keepalive", {
            roomCode,
            videoUrl,
            voiceWanted: !!window.__voryVoiceSessionWanted,
          });
          if (window.__voryVoiceSessionWanted) {
            socket.emit("voice-join", {
              roomCode,
              username: currentUserPayload.username,
              restore: true,
            });
            socket.emit("get-voice-users", { roomCode });
          }
        } catch {}
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
      setRoomSettings(data.settings || { publicRoom: true });
      setPendingInviteRoom("");
	  setLastRestoreMessage("");
      setStatus("Oda oluşturuldu.");
      bumpProfileStat("roomsJoined", 1);
      toast.success("Oda oluşturuldu 🚀");
      addLocalNotification({
        type: "room",
        title: "Oda oluşturuldu",
        message: `${currentUserPayload.username || "Kullanıcı"} yeni bir oda oluşturdu.`,
        roomCode: data.roomCode,
        displayRoomCode: true,
      });
      setYoutubeRoomCreating(false);

      if (data.currentMedia || data.videoUrl) {
        setCurrentMedia(data.currentMedia || null);
        setVideoUrl(data.videoUrl || data.currentMedia?.url || "");
        setMediaQueue(data.mediaQueue || []);
      }

      const pendingYoutubeVideo = pendingYoutubeVideoRef.current;
      if (pendingYoutubeVideo?.url) {
        const serverAlreadyStarted =
          String(data.currentMedia?.url || data.videoUrl || "").trim() ===
          String(pendingYoutubeVideo.url || "").trim();

        pendingYoutubeVideoRef.current = null;
        setVideoInput(pendingYoutubeVideo.url);

        if (!serverAlreadyStarted) {
          socket.emit("set-video", {
            roomCode: data.roomCode,
            videoUrl: pendingYoutubeVideo.url,
            title: pendingYoutubeVideo.title || pendingYoutubeVideo.url,
            thumbnail: pendingYoutubeVideo.thumbnail || "",
            channelTitle: pendingYoutubeVideo.channelTitle || "YouTube",
          });
        }
      }

      const pendingYoutubeQueue = pendingYoutubeQueueRef.current;
      if (pendingYoutubeQueue?.url) {
        pendingYoutubeQueueRef.current = null;
      autoSyncStabilizerRef.current = 0;
      autoSyncQuietUntilRef.current = 0;
        socket.emit("media-add-to-queue", {
          roomCode: data.roomCode,
          videoUrl: pendingYoutubeQueue.url,
          title: pendingYoutubeQueue.title || pendingYoutubeQueue.url,
          thumbnail: pendingYoutubeQueue.thumbnail || "",
          channelTitle: pendingYoutubeQueue.channelTitle || "YouTube",
        });
        showVoryToastOnce(`queue-add:${data.roomCode}:${pendingYoutubeQueue.url}`, "Video sıraya eklendi 📺", { success: true, ttl: 12000 });
      }
    });

    socket.on("room-joined", (data) => {
      const silentJoin = !!data?.restore || !!data?.silent || isVoryRoomRestoreActive();
      setRoomUrl(data.roomCode);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setRoomTheme("voryapp");
      setRoomSettings(data.settings || { publicRoom: false });
      setPendingInviteRoom("");
	  setLastRestoreMessage("");
      setStatus(silentJoin ? "Oda geri yüklendi." : "Odaya katıldın.");

      if (silentJoin) {
        markVoryRoomRestore(12000);
        return;
      }

      bumpProfileStat("roomsJoined", 1);
      showVoryToastOnce(`room-joined:${data.roomCode}`, "Odaya katıldın 🎉", { success: true, ttl: 15000 });
    });

    socket.on("room-left", () => {
      try {
        playerRef.current?.stopVideo?.();
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;

      setRoomUrl("");
      setRoomCode("");
      setUsers([]);
      setVoiceRoster([]);
      setMessages([]);
      setVideoUrl("");
      setCurrentMedia(null);
      setMediaQueue([]);
      setStatus("");
      setIsHost(false);
      setRoomTheme("voryapp");
      setRoomSettings({ publicRoom: false });
      setLastRestoreMessage("");
      setYoutubeRoomCreating(false);
      setYoutubeSelectedVideo(null);
      setRoomInvitePanelOpen(false);
      setSyncQuality({
        status: "idle",
        label: "Sync waiting",
        drift: 0,
        detail: "Waiting for video sync",
        updatedAt: 0,
      });
      pendingYoutubeQueueRef.current = null;
      autoSyncStabilizerRef.current = 0;
      autoSyncQuietUntilRef.current = 0;
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
      const cleanUrl = String(url || "").trim();
      const previousUrl = String(currentVideoUrlRef.current || "").trim();
      const sameActiveVideo = !!cleanUrl && cleanUrl === previousUrl;

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

        // Sekme/focus değişiminde server aynı aktif videoyu tekrar snapshot/video-updated
        // olarak gönderebiliyor. Aktif URL zaten aynıysa popup toast basma; sadece state güncel kalsın.
        if (!sameActiveVideo) {
          showVoryToastOnce(`video-updated:${roomCode || currentRoomCodeRef.current}:${cleanUrl}`, "Video odaya eklendi 🎬", { success: true, ttl: 10 * 60 * 1000 });
        }
      }
    });

    socket.on("video-control", ({ action, currentTime }) => {
      if (!playerRef.current) return;

      if (action === "pause" && isVoryMediaPauseProtected()) {
        try {
          const state = playerRef.current.getPlayerState?.();
          if (state === 2 || state === 5 || state === -1) {
            ignoreEventRef.current = true;
            playerRef.current.playVideo?.();
            setTimeout(() => {
              ignoreEventRef.current = false;
            }, 360);
          }
        } catch {}
        return;
      }

      const safeTime = Math.max(0, Number(currentTime) || 0);
      const localTime = Number(playerRef.current.getCurrentTime?.() || 0);
      const localState = playerRef.current.getPlayerState?.();
      const drift = Math.abs(localTime - safeTime);
      const mobileViewer = isMobileSyncViewer();

      // Host pause mobil viewer'a her zaman sert uygulanmalı.
      // Önce hedef zamana yaklaştır, sonra pause et; böyle 0.5-1sn ileri akıp durma kalmaz.
      const pauseSeekThreshold = mobileViewer ? 0.28 : 0.45;
      const shouldSeekOnPause = action === "pause" && drift > pauseSeekThreshold;
      const shouldSeekOnPlay = action === "play" && drift > (mobileViewer ? 1.55 : 1.35);
      const shouldSeek = shouldSeekOnPause || shouldSeekOnPlay;
      const shouldPlay = action === "play" && localState !== 1;
      const shouldPause = action === "pause" && localState !== 2 && !isVoryMediaPauseProtected();

      if (!shouldSeek && !shouldPlay && !shouldPause) return;

      ignoreEventRef.current = true;

      if (shouldSeek) {
        playerRef.current.seekTo(safeTime, true);
      }

      if (shouldPlay) playerRef.current.playVideo?.();
      if (shouldPause) {
        playerRef.current.pauseVideo?.();
        window.__voryLatestSyncState = {
          ...(window.__voryLatestSyncState || {}),
          isPlaying: false,
          currentTime: safeTime,
          updatedAt: Date.now(),
        };
      }

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, shouldPause ? 520 : shouldSeek ? 700 : 380);
    });

    socket.on("video-seek", ({ currentTime }) => {
      if (!playerRef.current) return;

      const safeTime = Math.max(0, Number(currentTime) || 0);
      const localTime = Number(playerRef.current.getCurrentTime?.() || 0);
      if (Math.abs(localTime - safeTime) < 0.75) return;

      ignoreEventRef.current = true;
      playerRef.current.seekTo(safeTime, true);

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, 700);
    });

    // Vory 5.5.3E.12.2: applySyncState is defined at component scope;
    // socket handlers below reuse the single shared sync implementation.


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
      const senderName = data?.sender || data?.username || "Misafir";
      const matchedUser = (roomUsersRef.current || []).find((user) =>
        String(user?.username || "").trim().toLowerCase() === String(senderName || "").trim().toLowerCase() ||
        (data?.userId && String(user?.userId || user?._id || user?.id || "") === String(data.userId))
      );

      const nextMessage = {
        id: data?.id || `${Date.now()}-${Math.random()}`,
        sender: senderName,
        userId: data?.userId || "",
        avatar: data?.avatar || matchedUser?.avatar || "",
        message: data?.message || "",
        createdAt: data?.createdAt || Date.now(),
      };

      setMessages((prev) => [...prev, nextMessage]);
      showFullscreenChatToast(nextMessage);
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
      if (isVoryRoomRestoreActive() && isJoinRestoreMessage(msg)) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}-${Math.random()}`,
          type: "system",
          sender: "Vory",
          message: `⚙️ ${msg}`,
          createdAt: Date.now(),
        },
      ]);
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

    const updatePresenceState = (presenceUsers) => {
      const nextPresence = Array.isArray(presenceUsers) ? presenceUsers : [];
      const nextSignature = nextPresence
        .map((user) => `${user.userId || user.id || ""}:${user.roomCode || ""}:${user.activity || ""}:${user.status || ""}:${user.updatedAt || ""}:${user.lastSeenAt || ""}:${user.isOnline}`)
        .join("|");

      if (presenceSignatureRef.current === nextSignature) return;
      presenceSignatureRef.current = nextSignature;
      setOnlinePresence(nextPresence);
    };

    socket.on("online-users", updatePresenceState);
    socket.on("presence-changed", updatePresenceState);

    socket.on("discovery-rooms-updated", ({ rooms, invitedRooms, privateRooms }) => {
      const nextRooms = Array.isArray(rooms) ? rooms : [];
      const nextInvitedRooms = Array.isArray(invitedRooms)
        ? invitedRooms
        : Array.isArray(privateRooms)
          ? privateRooms
          : [];

      const nextSignature = JSON.stringify({
        public: nextRooms.map((room) => [room.roomCode, room.userCount, room.mediaTitle, room.mediaThumbnail, room.hostUsername]),
        invited: nextInvitedRooms.map((room) => [room.roomCode, room.userCount, room.mediaTitle, room.mediaThumbnail, room.hostUsername]),
      });

      if (discoverySignatureRef.current !== nextSignature) {
        discoverySignatureRef.current = nextSignature;
        setDiscoveryRooms(nextRooms);
        setInvitedDiscoveryRooms(nextInvitedRooms);
      }

      window.clearTimeout(window.__voryDiscoveryLoadingGuard);
      setDiscoveryLoading(false);
    });

    socket.on("room-settings-updated", ({ settings }) => {
      setRoomSettings(settings || { publicRoom: false });
      setDiscoveryLoading(false);
      socket.emit("get-discovery-rooms");
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
      const restoreJoinPopup =
        isVoryRoomRestoreActive() &&
        String(notification?.type || "") === "room" &&
        isJoinRestoreMessage(notification?.message || notification?.title || "");

      if (restoreJoinPopup) return;

      addLocalNotification(notification);

      if (notification?.message) {
        const cleanType = String(notification.type || "notice");
        const cleanMessage = String(notification.message || "");
        const cleanRoom = String(notification.roomCode || roomCode || currentRoomCodeRef.current || "global").trim().toUpperCase();

        // Video popup'ı zaten video-updated handler'ından kontrollü veriliyor.
        // Restore/sekme değişiminde server notification:new tekrar gönderirse burada popup basma.
        if (cleanType === "video" || cleanMessage.toLowerCase().includes("video odaya eklendi")) {
          voryToastDedupeRef.current.set(`video-updated:${cleanRoom}:${currentVideoUrlRef.current || "active"}`, Date.now());
          return;
        }

        const notificationKey = notification.id || notification._id || `${cleanType}:${cleanRoom}:${cleanMessage}`;
        showVoryToastOnce(notificationKey, notification.message, {
          ttl: 18000,
          toastOptions: {
            icon:
              cleanType === "voice"
                  ? "🎤"
                  : "🔔",
          },
        });
      }
    });

    socket.on("media-queue-updated", ({ currentMedia, queue }) => {
      setCurrentMedia(currentMedia || null);
      setMediaQueue(queue || []);
    });

    socket.on("media-queue-empty", ({ roomCode: emptyRoomCode } = {}) => {
      const targetRoom = String(emptyRoomCode || "").toUpperCase();
      const currentRoom = String(currentRoomCodeRef.current || roomCode || "").toUpperCase();
      if (!isHost || (targetRoom && currentRoom && targetRoom !== currentRoom)) return;

      setCreateSheetOpen(true);
      setYoutubeBrowserOpen(false);
      showVoryToastOnce(`platform-empty:${currentRoom}:${Date.now()}`, "Sırada video yok. Yeni platform seç 🎬", { ttl: 2500 });
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
      if (!invite?.roomCode) return;

      // Vory 5.4.8D:
      // Invite banner yok; davet sadece bildirim merkezinden yönetiliyor.
      // notification:new çoğu durumda yeterli ama güvenli olması için burada da
      // aynı invite'ı local notification listesine geçiriyoruz.
      setPartyInvite(invite);
      addLocalNotification({
        ...invite,
        type: "invite",
        title: invite.title || "Party Invite",
        message: invite.message || `${invite.fromUsername || "Kullanıcı"} seni odaya davet etti.`,
      });
      socket.emit("get-discovery-rooms");

      showVoryToastOnce(`party-invite:${invite.roomCode}:${invite.fromUserId || invite.fromUsername || "user"}`, `${invite.fromUsername || "Kullanıcı"} seni davet etti 🎉`, { success: true, ttl: 20000 });
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
      socket.off("dm:received");
      socket.off("dm:sent");
      socket.off("dm:read");
      socket.off("dm:typing");
      socket.off("notification:new");
      socket.off("media-queue-updated");
      socket.off("media-queue-empty");
      socket.off("media-current-updated");
      socket.off("party-invite-received");
      socket.off("reaction:new");
    };
  }, []);



  useEffect(() => {
    localVoiceActiveRef.current = (voiceRoster || []).some((user) =>
      String(user?.socketId || user?.id || "") === String(socket.id || "")
    );
  }, [voiceRoster]);

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

    // Vory 5.5.3E.13.5: do not force a sync on every interval mount;
    // reconnect/socket snapshots already send room state and repeated force-sync can stutter.
    if (!videoUrl) socket.emit("force-video-sync", { roomCode });

    syncIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const currentTime = playerRef.current.getCurrentTime?.() || 0;
      const playerState = playerRef.current.getPlayerState?.();
      const playing = playerState === 1;

      if (playing) {
        bumpProfileStat("watchSeconds", isHost ? 6 : 7);
      }

      if (isHost && playing) {
        updateSyncQuality({
          drift: 0,
          soft: true,
          reason: "host-heartbeat",
        });
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
        const localInVoice = !!localVoiceActiveRef.current;
        const now = Date.now();
        const voiceTransitionUntil = Number(window.__voryVoiceTransitionUntil || 0);
        if (now < voiceTransitionUntil) return;
        const clientSyncDelay = localInVoice ? 9000 : 3200;

        if (now - lastClientSyncEmitRef.current >= clientSyncDelay) {
          lastClientSyncEmitRef.current = now;
          socket.emit("client-sync-state", {
            roomCode,
            currentTime,
            isPlaying: playing,
            watchTitle,
            voiceActive: localInVoice,
          });
        }
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
    if (!roomCode || !videoUrl) return;

    const replayPendingSync = () => {
      const pending = pendingSyncStateRef.current;
      if (!pending || !playerRef.current) return;
      pendingSyncStateRef.current = null;
      applySyncState(pending);
    };

    const t1 = setTimeout(() => {
      replayPendingSync();
      socket.emit("force-video-sync", { roomCode, reason: "manual-hard" });
    }, 120);

    const t2 = setTimeout(() => {
      replayPendingSync();
      socket.emit("force-video-sync", { roomCode, reason: "join-room" });
    }, 900);

    const t3 = setTimeout(() => {
      replayPendingSync();
      socket.emit("force-video-sync", { roomCode, reason: "join-room" });
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [roomCode, videoUrl]);


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

    window.clearTimeout(window.__voryDiscoveryLoadingGuard);
    window.__voryDiscoveryLoadingGuard = window.setTimeout(() => {
      setDiscoveryLoading(false);
    }, 1400);
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
      // Vory 5.5.3E.11.7:
      // Public flag kalıcı görünürlük tercihidir.
      // Odayı gizle/göster için roomLocked kullanılır; inviteOnly discovery görünürlüğünü bozmaz.
      publicRoom: !!nextPublic,
    };

    setRoomSettings(nextSettings);
    socket.emit("room-settings-update", {
      roomCode,
      settings: nextSettings,
    });

    toast.success(nextPublic ? "Oda Discovery'de public oldu 🌍" : "Oda private moda geçti 🔒");
  }

  function createRoom(options = {}) {
    const allowWithoutVideo = !!options.allowWithoutVideo;
    const pendingMedia = pendingYoutubeVideoRef.current || pendingYoutubeQueueRef.current || null;
    const hasPendingYoutubeMedia = !!pendingMedia?.url;

    if (!allowWithoutVideo && !hasPendingYoutubeMedia) {
      setCreateSheetOpen(false);
      openYouTubeBrowser();
      toast("Önce YouTube videosu seç knks. Oda video seçilince kurulacak 🎬", { icon: "▶️" });
      return;
    }

    setPendingInviteRoom("");
    setLastRestoreMessage("");

    socket.emit("create-room", {
      ...currentUserPayload,
      initialMedia: pendingMedia?.url
        ? {
            videoUrl: pendingMedia.url,
            url: pendingMedia.url,
            title: pendingMedia.title || pendingMedia.url,
            thumbnail: pendingMedia.thumbnail || "",
            channelTitle: pendingMedia.channelTitle || "YouTube",
          }
        : null,
      settings: {
        publicRoom: true,
        inviteOnly: false,
      },
    });
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

    // Vory 5.5.3E.10.2: sadece gerçek odadan çıkışta media/voice temizle.
    // Tab değiştirme, profile/queue geçişi veya mobil background bu akışı tetiklemez.
    try {
      window.dispatchEvent(new CustomEvent("vory-force-voice-leave", { detail: { roomCode } }));
      socket.emit("voice-leave", { roomCode });
    } catch {}

    try {
      playerRef.current?.stopVideo?.();
      playerRef.current?.destroy?.();
    } catch {}
    playerRef.current = null;

    socket.emit("leave-room", { roomCode });
  }

  function handleLogoutCleanup() {
    try {
      socket.emit("user-logout", { userId: currentUserId });
      socket.emit("user-logout", { userId: currentUserIdRef.current });

      if (roomCode) {
        try {
          window.dispatchEvent(new CustomEvent("vory-force-voice-leave", { detail: { roomCode } }));
          socket.emit("voice-leave", { roomCode });
        } catch {}
        socket.emit("leave-room", { roomCode });
      }

      // Vory 5.5.3E.1: aynı tarayıcıda hesap değişince eski hesap online/away kalmasın.
      // Logout sonrası socket'i kısa süre kapatıp yeni login için temiz bağlantı açıyoruz.
      window.__voryManualLogoutAt = Date.now();
      setTimeout(() => {
        try {
          socket.disconnect();
          setTimeout(() => socket.connect(), 320);
        } catch {}
      }, 80);

      localStorage.removeItem("vory-last-room");
      sessionStorage.removeItem("vory-last-room");
      window.currentRoomCode = "";
    } catch {}

    setRoomUrl("");
    setRoomCode("");
    setUsers([]);
    setVoiceRoster([]);
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
      userId: currentUserPayload.userId,
      avatar: currentUserPayload.avatar,
    });

    socket.emit("typing-stop", { roomCode });

    bumpProfileStat("messagesSent", 1);
    setTypingUser("");
    setMessage("");
  }

  function handleVideoControl(action, currentTime) {
    if (!roomCode) return;

    if (action === "pause" && isVoryMediaPauseProtected()) {
      try {
        const state = playerRef.current?.getPlayerState?.();
        if (state === 2 || state === 5 || state === -1) {
          ignoreEventRef.current = true;
          playerRef.current?.playVideo?.();
          setTimeout(() => {
            ignoreEventRef.current = false;
          }, 360);
        }
      } catch {}
      return;
    }

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






  function restorePreviousSession() {
    // Vory 3.2 Rave flow: otomatik oda restore kapalı.
    localStorage.removeItem("vory-last-room");
    sessionStorage.removeItem("vory-last-room");
    setLastRestoreMessage("");
  }

  function requestHardSync(reason = "manual") {
    if (!roomCode) return;

    socket.emit("request-sync", {
      roomCode,
      reason,
    });
  }

  function addLocalNotification(notification) {
    const notificationType = notification?.type || "system";
    const notificationMessage = notification?.message || "";
    const notificationRoom = notification?.roomCode || "";
    const stableJoinId =
      notificationType === "room" && isJoinRestoreMessage(notificationMessage || notification?.title || "")
        ? `room-join:${String(notificationRoom || currentRoomCodeRef.current || "global").trim().toUpperCase()}:${String(notificationMessage || "").trim().toLowerCase()}`
        : "";

    const safeNotification = {
      ...(notification || {}),
      id: notification?.id || stableJoinId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: notificationType,
      title: notification?.title || "VoryApp",
      message: notificationMessage,
      roomCode: notificationRoom,
      displayRoomCode: Boolean(notification?.displayRoomCode),
      createdAt: notification?.createdAt || Date.now(),
      read: false,
    };

    setNotifications((prev) => {
      const deduped = (prev || []).filter((item) => item?.id !== safeNotification.id);
      return [safeNotification, ...deduped].slice(0, 50);
    });
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


  function renderRoomInvitePanel() {
    if (!roomCode || !roomInvitePanelOpen) return null;

    const availableFriends = roomInviteFriends.filter(
      (friend) => String(friend.roomCode || "").toUpperCase() !== String(roomCode || "").toUpperCase()
    );

    return (
      <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center" onClick={() => setRoomInvitePanelOpen(false)}>
        <div
          className="vory-room-invite-popover w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-black/92 p-4 shadow-[0_30px_110px_rgba(0,0,0,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200/55">Party Invite</p>
              <h2 className="mt-1 text-xl font-black text-white">Arkadaş davet et</h2>
              <p className="mt-1 text-xs font-bold text-white/38">Link yok, arkadaşını direkt odaya çağır.</p>
            </div>
            <button
              type="button"
              onClick={() => setRoomInvitePanelOpen(false)}
              className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/55 transition hover:bg-white/12 hover:text-white"
            >
              Kapat
            </button>
          </div>

          {availableFriends.length ? (
            <div className="custom-scroll max-h-[340px] space-y-2 overflow-auto pr-1">
              {availableFriends.map((friend) => {
                const friendId = friend.userId || friend._id || friend.id || friend.socketId;
                const initial = String(friend.username || "V").charAt(0).toUpperCase();
                const cooldownKey = friend.userId || friend._id || friend.id || friend.socketId;
                const cooldownUntil = Number(inviteCooldowns?.[cooldownKey] || 0);
                const waiting = cooldownUntil > Date.now();

                return (
                  <button
                    key={friendId}
                    type="button"
                    disabled={waiting}
                    onClick={() => sendPartyInvite(friend)}
                    className="flex w-full items-center gap-3 rounded-[1.35rem] border border-white/8 bg-white/[0.045] p-3 text-left transition hover:border-violet-300/25 hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-black text-white">
                      {friend.avatar ? <img src={friend.avatar} alt="" className="h-full w-full object-cover" /> : initial}
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-300" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white">@{friend.username}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-white/35">
                        {waiting ? "Biraz bekle..." : "Online • davet gönder"}
                      </span>
                    </span>

                    <span className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-black">
                      Invite
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-5 text-center">
              <p className="text-sm font-black text-white/70">Online arkadaş yok</p>
              <p className="mt-1 text-xs font-bold text-white/35">Arkadaşların online olunca burada görünür knks.</p>
            </div>
          )}
        </div>
      </div>
    );
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
        setRoomInvitePanelOpen(false);
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
    if (!notification) return;

    if (notification.type === "invite") {
      const targetRoom = String(notification.roomCode || "").trim().toUpperCase();

      if (!targetRoom) {
        toast.error("Davet odası bulunamadı.");
        return;
      }

      joinRoom(targetRoom);
      setPartyInvite(null);
      return;
    }

    if (notification.type !== "dm") return;

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
    try {
      // Vory 5.5.3E.10.3:
      // Profile/Queue/Room gibi UI geçişleri YouTube iframe/WebRTC cihaz geçişi kaynaklı
      // sahte pause/leave tetiklemesin.
      window.__voryMediaPersistUntil = Date.now() + 8500;
      if (window.__voryVoiceSessionWanted) {
        window.__voryVoiceTransitionUntil = Date.now() + 8500;
      }
    } catch {}

    if ((section === "room" || section === "settings") && !roomCode) {
      setAppSection("watch");
      setActiveMobileTab("watch");
      toast("Oda ayarları için önce bir odaya gir veya YouTube seçerek oda oluştur.", { icon: "🏠" });
      return;
    }

    const nextSectionMap = {
      room: "settings",
      settings: "settings",
      people: "friends",
      friends: "friends",
      voice: "watch",
      chat: "watch",
      dm: "friends",
      social: "friends",
      screen: "watch",
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

    const nextMobileTabMap = {
      settings: "room",
      room: "room",
      friends: "people",
      people: "people",
      dm: "people",
      social: "people",
      profile: "profile",
      watch: "watch",
    };

    setActiveMobileTab(nextMobileTabMap[section] || nextMobileTabMap[nextSection] || "watch");
  }

  function changeRoomTheme() {
    setRoomTheme("voryapp");
    toast("VoryApp teması sabit aktif 💜");
  }


  function openYouTubeBrowser() {
    setCreateSheetOpen(false);
    setYoutubeBrowserOpen(true);
    setAppSection("watch");
    setActiveMobileTab("watch");
    setYoutubeSearchQuery("");
    setYoutubeResults([]);
    setYoutubeError("");
    setYoutubeNextPageToken("");
    setYoutubeTab("home");

    toast("YouTube açıldı. Önce videoyu seç, oda video seçildiğinde kurulsun 📺", { icon: "▶️" });
  }

  function closeYouTubeBrowser() {
    setYoutubeBrowserOpen(false);
    setYoutubeError("");
    setYoutubeSelectedVideo(null);
  }

  function getYoutubeWatchUrl(video) {
    const videoId = video?.videoId || video?.id;
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";
  }

  function saveYouTubeRecentSearch(query) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) return;

    setYoutubeRecentSearches((prev) => {
      const filtered = (prev || []).filter(
        (item) => item.toLowerCase() !== cleanQuery.toLowerCase()
      );

      return [cleanQuery, ...filtered].slice(0, performanceMode ? 4 : 8);
    });
  }

  function submitYoutubeSearch(query = youtubeSearchQuery) {
    const cleanQuery = normalizeYouTubeSearchQuery(query);

    if (!cleanQuery) return;

    const nextKey = getYouTubeSearchCacheKey(cleanQuery, "home");
    const currentKey = getYouTubeSearchCacheKey(youtubeSearchQuery, youtubeTab);

    setYoutubeTab("home");
    setYoutubeSearchQuery(cleanQuery);

    if (nextKey !== currentKey) {
      setYoutubeResults([]);
      setYoutubeNextPageToken("");
    }

    saveYouTubeRecentSearch(cleanQuery);
  }

  async function loadMoreYoutubeResults() {
    const query = normalizeYouTubeSearchQuery(youtubeSearchQuery);

    if (!query || query.length < 3 || !youtubeNextPageToken || youtubeLoadingMore) return;

    const pageCacheKey = getYouTubeSearchCacheKey(query, youtubeTab, youtubeNextPageToken);
    if (youtubeLastLoadMoreKeyRef.current === pageCacheKey) return;

    const cached = youtubeSearchCacheRef.current.get(pageCacheKey);
    if (cached && Date.now() - Number(cached.cachedAt || 0) < YOUTUBE_CLIENT_CACHE_TTL_MS) {
      setYoutubeResults((prev) => [...(prev || []), ...(cached.items || [])]);
      setYoutubeNextPageToken(cached.nextPageToken || "");
      return;
    }

    try {
      youtubeLastLoadMoreKeyRef.current = pageCacheKey;
      setYoutubeLoadingMore(true);

      const response = await api.get("/youtube/search", {
        params: {
          q: query,
          maxResults: youtubeTab === "shorts" ? 10 : 10,
          pageToken: youtubeNextPageToken,
          shorts: youtubeTab === "shorts" ? "1" : "",
        },
      });

      const nextItems = response.data?.items || [];
      const nextPageToken = response.data?.nextPageToken || "";

      youtubeSearchCacheRef.current.set(pageCacheKey, {
        items: nextItems,
        nextPageToken,
        cachedAt: Date.now(),
      });

      setYoutubeResults((prev) => [...(prev || []), ...nextItems]);
      setYoutubeNextPageToken(nextPageToken);
    } catch (error) {
      if (isYouTubeSearchThrottleError(error)) {
        youtubeSearchCooldownUntilRef.current = Date.now() + YOUTUBE_SEARCH_RETRY_DELAY_MS;
        // Infinite scroll aynı anda iki kez tetiklenirse kullanıcıya kırmızı hata gösterme.
        return;
      }

      console.error("YouTube load more error:", error);
      toast.error(error?.response?.data?.message || "Daha fazla video alınamadı.");
    } finally {
      setYoutubeLoadingMore(false);
      setTimeout(() => {
        if (youtubeLastLoadMoreKeyRef.current === pageCacheKey) {
          youtubeLastLoadMoreKeyRef.current = "";
        }
      }, 1200);
    }
  }

  function handleYoutubeVoiceSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast("Bu tarayıcı sesli aramayı desteklemiyor.", { icon: "🎤" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) submitYoutubeSearch(transcript);
    };

    recognition.onerror = () => {
      toast.error("Sesli arama başlatılamadı.");
    };

    recognition.start();
    toast("Dinliyorum knks 🎤");
  }

  function openYoutubeVideoPreview(video) {
    if (!video) return;
    setYoutubeSelectedVideo(video);
  }

  function closeYoutubeVideoPreview() {
    setYoutubeSelectedVideo(null);
  }

  function getYoutubeVideoTitle(video) {
    const videoUrl = getYoutubeWatchUrl(video);
    return video?.title || normalizeHistoryTitle(videoUrl);
  }

  function playYoutubePreviewNow(video = youtubeSelectedVideo) {
    setYoutubeSelectedVideo(null);
    playYoutubeBrowserVideo(video);
  }

  function addYoutubePreviewToQueue(video = youtubeSelectedVideo) {
    const videoUrl = getYoutubeWatchUrl(video);

    if (!videoUrl) {
      toast.error("Video sıraya eklenemedi.");
      return;
    }

    const title = getYoutubeVideoTitle(video);

    saveYouTubeRecentSearch(youtubeSearchQuery);
    setYoutubeSelectedVideo(null);

    if (!roomCode) {
      pendingYoutubeVideoRef.current = {
        url: videoUrl,
        title,
        thumbnail: video.thumbnail || "",
        channelTitle: video.channelTitle || "YouTube",
      };
      pendingYoutubeQueueRef.current = null;
      autoSyncStabilizerRef.current = 0;
      autoSyncQuietUntilRef.current = 0;

      if (!youtubeRoomCreating) {
        setYoutubeRoomCreating(true);
        createRoom({ allowWithoutVideo: false });
      }

      toast.success("Oda kuruluyor, video otomatik açılacak 🎬");
      return;
    }

    socket.emit("media-add-to-queue", {
      roomCode,
      videoUrl,
      title,
      thumbnail: video.thumbnail || "",
      channelTitle: video.channelTitle || "YouTube",
    });

    showVoryToastOnce(`queue-add:${roomCode}:${videoUrl}`, "Video sıraya eklendi 📺", { success: true, ttl: 12000 });
  }

  function playYoutubeBrowserVideo(video) {
    const videoUrl = getYoutubeWatchUrl(video);

    if (!videoUrl) {
      toast.error("Video seçilemedi.");
      return;
    }

    const title = video.title || normalizeHistoryTitle(videoUrl);

    saveYouTubeRecentSearch(youtubeSearchQuery);
    setYoutubeBrowserOpen(false);
    setVideoInput(videoUrl);
    setAppSection("watch");
    setActiveMobileTab("watch");

    recordWatchItem({
      url: videoUrl,
      title,
      meta: video.channelTitle ? `YouTube • ${video.channelTitle}` : "YouTube Browser",
      roomCode,
    });

    if (!roomCode) {
      pendingYoutubeVideoRef.current = {
        url: videoUrl,
        title,
        thumbnail: video.thumbnail || "",
        channelTitle: video.channelTitle || "YouTube",
      };

      createRoom({ allowWithoutVideo: false });
      toast.success("Oda kuruluyor, video otomatik açılacak 🎬");
      return;
    }

    socket.emit("set-video", {
      roomCode,
      videoUrl,
      title,
      thumbnail: video.thumbnail || "",
      channelTitle: video.channelTitle || "YouTube",
    });

    toast.success("Video başladı ▶️");
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
      openYouTubeBrowser();
      return;
    }

    toast(`${platform.name} yakında. Şimdilik YouTube/Web akışı aktif.`, { icon: "✨" });
  }

  function renderPlatformSheet() {
    if (!createSheetOpen) return null;

    const platforms = [
      {
        id: "youtube",
        name: "YouTube",
        label: "LIVE",
        tone: "youtube",
        icon: <span className="vory-platform-brand vory-platform-brand-youtube" aria-hidden="true" />,
        description: "Vory içinde YouTube ara, videoyu seç ve odayı direkt başlat.",
        active: true,
      },
      {
        id: "web",
        name: "Web Link",
        label: "LIVE",
        tone: "web",
        icon: <span className="vory-platform-brand vory-platform-brand-web" aria-hidden="true" />,
        description: "Desteklenen video linklerini sade Vory oda akışıyla aç.",
        active: true,
      },
      {
        id: "drive",
        name: "Google Drive",
        label: "SOON",
        tone: "drive",
        icon: <span className="vory-platform-brand vory-platform-brand-drive" aria-hidden="true" />,
        description: "Drive videoları için özel ve güvenli izleme akışı yakında.",
      },
      {
        id: "netflix",
        name: "Netflix",
        label: "SOON",
        tone: "netflix",
        icon: <span className="vory-platform-brand vory-platform-brand-netflix">N</span>,
        description: "Premium watch-party görünümüyle Netflix desteği planlandı.",
      },
      {
        id: "prime",
        name: "Prime Video",
        label: "SOON",
        tone: "prime",
        icon: <span className="vory-platform-brand vory-platform-brand-prime">prime</span>,
        description: "Prime Video odaları daha sonra Vory akışına eklenecek.",
      },
      {
        id: "disney",
        name: "Disney+",
        label: "SOON",
        tone: "disney",
        icon: <span className="vory-platform-brand vory-platform-brand-disney">D+</span>,
        description: "Disney+ için sade ve sinematik oda deneyimi yakında.",
      },
      {
        id: "spotify",
        name: "Spotify",
        label: "SOON",
        tone: "spotify",
        icon: <span className="vory-platform-brand vory-platform-brand-spotify" aria-hidden="true" />,
        description: "Arkadaşlarla müzik odaları için Vory ses akışı planlandı.",
      },
      {
        id: "playlist",
        name: "Playlist",
        label: "SOON",
        tone: "playlist",
        icon: <span className="vory-platform-brand vory-platform-brand-playlist" aria-hidden="true" />,
        description: "Film gecesi listeleri ve ortak kuyruk deneyimi yakında.",
      },
    ];

    return (
      <div className="vory-platform-sheet fixed inset-0 z-[9999] overflow-auto px-4 py-4 text-white backdrop-blur-2xl sm:px-6 sm:py-6">
        <div className="vory-platform-aurora" />

        <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col">
          <div className="vory-platform-header sticky top-0 z-10 -mx-4 mb-5 px-4 py-4 backdrop-blur-2xl sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.9)]" />
                  Start a room
                </div>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] text-white drop-shadow-xl sm:text-6xl">vory</h1>
                <p className="mt-1 max-w-xl text-sm font-bold text-white/45 sm:text-base">
                  Rave gibi sade: platformu seç, videoyu aç, arkadaşlarınla aynı anda izle.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateSheetOpen(false)}
                className="vory-platform-close flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-light text-black shadow-[0_18px_60px_rgba(255,255,255,0.18)] transition hover:scale-[1.04] sm:h-14 sm:w-14"
                aria-label="Platform ekranını kapat"
              >
                ×
              </button>
            </div>
          </div>

          <div className="vory-platform-search mb-5 rounded-[2rem] border border-white/10 bg-white/[0.055] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-4">
            <div className="flex items-center gap-3 rounded-[1.45rem] bg-black/38 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:px-5">
              <span className="vory-platform-search-icon">⌕</span>
              <input
                readOnly
                value="YouTube ara, video seç veya link akışını kullan"
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-white/42 outline-none sm:text-lg"
              />
            </div>
          </div>

          <div className="vory-platform-grid grid grid-cols-2 gap-3 pb-32 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => selectPlatform(platform)}
                className={`vory-platform-card vory-platform-card-${platform.tone || platform.id} ${platform.active ? "vory-platform-card-active" : ""}`}
              >
                <div className={`vory-platform-badge ${platform.active ? "vory-platform-badge-live" : ""}`}>
                  {platform.label}
                </div>

                <div className="vory-platform-icon">
                  {platform.icon}
                </div>

                <h3>{platform.name}</h3>
                <p>{platform.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderYouTubeBrowser() {
    if (!youtubeBrowserOpen) return null;

    const cleanQuery = youtubeSearchQuery.trim();
    const hasQuery = cleanQuery.length >= 2;
    const baseSuggestions = [
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
    ];
    const trendingSearches = [
      "Trending Music",
      "Gaming",
      "Komedi",
      "Film",
      "Podcast",
      "Valorant",
      "Semicenk",
      "Elraen",
    ];
    const suggestions = cleanQuery
      ? baseSuggestions
          .filter((item) => item.toLowerCase().includes(cleanQuery.toLowerCase()))
          .concat(
            cleanQuery.length > 1
              ? [
                  `${cleanQuery} izle`,
                  `${cleanQuery} yeni`,
                  `${cleanQuery} şarkı`,
                  `${cleanQuery} shorts`,
                ]
              : []
          )
          .filter((item, index, array) => array.indexOf(item) === index)
          .slice(0, 10)
      : [];

    return (
      <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#080808] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_18%),radial-gradient(circle_at_16%_38%,rgba(255,255,255,0.09),transparent_18%),radial-gradient(circle_at_78%_32%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_25%)]" />
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" />

        <div className="relative z-10 flex h-full flex-col">
          <header className="grid h-[72px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/20 bg-black/22 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-7">
              <button
                type="button"
                onClick={closeYouTubeBrowser}
                className="flex h-12 w-12 items-center justify-center rounded-full text-5xl font-light leading-none text-white transition hover:bg-white/10"
                aria-label="YouTube Browser kapat"
              >
                ×
              </button>

              <button
                type="button"
                onClick={() => setCreateSheetOpen(true)}
                className="hidden h-11 w-11 items-center justify-center rounded-full text-3xl font-black text-white transition hover:bg-white/10 sm:flex"
                aria-label="Platform menüsü"
              >
                ≡
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setYoutubeSearchQuery("");
                setYoutubeResults([]);
                setYoutubeNextPageToken("");
                setYoutubeTab("home");
              }}
              className="text-5xl font-black tracking-[-0.09em] text-white drop-shadow-[0_4px_18px_rgba(255,255,255,0.22)]"
            >
              vory
            </button>

            <div className="flex items-center justify-end gap-5">
              <button
                type="button"
                className="hidden h-11 w-11 items-center justify-center rounded-full text-3xl text-white transition hover:bg-white/10 sm:flex"
                onClick={() => toast("YouTube ayarları yakında knks ⚙️")}
              >
                ⚙
              </button>

              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full text-3xl text-white transition hover:bg-white/10"
                onClick={() => setRightPanelTab("people")}
              >
                👥
              </button>
            </div>
          </header>

          <div className="flex h-[40px] shrink-0 items-center justify-between border-b border-white/12 bg-black/30 px-3">
            <div className="flex items-center gap-2 text-lg font-black">
              <span className="vory-youtube-mini-icon" aria-hidden="true" />
              <span>YouTube</span>
            </div>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-2xl text-white/90 transition hover:bg-white/10"
              onClick={() => {
                const input = document.querySelector("[data-vory-youtube-search]");
                input?.focus?.();
              }}
              aria-label="YouTube arama"
            >
              ⌕
            </button>
          </div>

          <main className="min-h-0 flex-1 overflow-auto pb-16">
            <section className={`${hasQuery ? "pt-3" : "pt-20"} px-4 transition-all`}>
              {!hasQuery ? (
                <div className="mb-8 flex justify-center">
                  <div className="flex h-20 w-28 items-center justify-center rounded-[1.5rem] bg-red-600 shadow-[0_18px_70px_rgba(220,38,38,0.38)]">
                    <span className="vory-youtube-hero-play" aria-hidden="true" />
                  </div>
                </div>
              ) : null}

              <div className="mx-auto max-w-[calc(100vw-2rem)]">
                <div className="flex h-11 items-center gap-3 rounded-full bg-white/14 px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/70 hover:bg-white/10"
                    onClick={() => {
                      if (hasQuery) {
                        setYoutubeSearchQuery("");
                        setYoutubeResults([]);
                        setYoutubeNextPageToken("");
                        return;
                      }

                      closeYouTubeBrowser();
                    }}
                  >
                    ←
                  </button>

                  <input
                    data-vory-youtube-search
                    value={youtubeSearchQuery}
                    onChange={(event) => {
                      setYoutubeSearchQuery(event.target.value);
                      setYoutubeNextPageToken("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitYoutubeSearch();
                      }
                    }}
                    placeholder="YouTube'da arayın"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/38"
                    autoFocus
                  />

                  {hasQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeSearchQuery("");
                        setYoutubeResults([]);
                        setYoutubeNextPageToken("");
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-white/70 hover:bg-white/10"
                    >
                      ×
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => submitYoutubeSearch()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-white hover:bg-white/10"
                  >
                    ⌕
                  </button>

                  <button
                    type="button"
                    onClick={handleYoutubeVoiceSearch}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/18"
                    title="Sesli ara"
                  >
                    <span className="vory-youtube-mic-icon" aria-hidden="true" />
                  </button>
                </div>

                {hasQuery && !youtubeResults.length && suggestions.length ? (
                  <div className="mt-2 overflow-hidden rounded-2xl bg-[#202020]/95 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => submitYoutubeSearch(suggestion)}
                        className="flex w-full items-center justify-between border-b border-white/7 px-3 py-2 text-left text-sm font-black text-white transition last:border-b-0 hover:bg-white/8"
                      >
                        <span>{suggestion}</span>
                        <span className="text-2xl text-white/65">↖</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {!hasQuery ? (
                  <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white/8 p-5 text-center shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
                    <p className="text-2xl font-black tracking-[-0.04em]">Başlamak için arama yapın</p>
                    <p className="mt-2 text-sm font-bold text-white/45">
                      İlginizi çekebilecek içeriklerle dolu bir akış oluşturabilmemiz için video izlemeye başlayın.
                    </p>
                  </div>
                ) : null}

                {!hasQuery && youtubeRecentSearches.length ? (
                  <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white/48">Son aramalar</h3>
                      <button
                        type="button"
                        onClick={() => setYoutubeRecentSearches([])}
                        className="text-xs font-black text-white/40 hover:text-white"
                      >
                        temizle
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {youtubeRecentSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => submitYoutubeSearch(item)}
                          className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white/70 transition hover:bg-white/18 hover:text-white"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!hasQuery ? (
                  <div className="mt-8">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/48">Trend aramalar</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {trendingSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => submitYoutubeSearch(item)}
                          className="rounded-2xl border border-white/8 bg-white/8 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-white/14"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {hasQuery ? (
              <section className="mt-5 px-4">
                <div className="mb-4 flex items-center justify-center">
                  <div className="grid w-full max-w-lg grid-cols-2 rounded-full bg-black/45 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)]">
                    <button
                      type="button"
                      onClick={() => setYoutubeTab("home")}
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                        youtubeTab === "home" ? "bg-white text-black" : "text-white/55 hover:text-white"
                      }`}
                    >
                      Ana Sayfa
                    </button>
                    <button
                      type="button"
                      onClick={() => setYoutubeTab("shorts")}
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                        youtubeTab === "shorts" ? "bg-white text-black" : "text-white/55 hover:text-white"
                      }`}
                    >
                      Shorts
                    </button>
                  </div>
                </div>

                {youtubeLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="h-44 animate-pulse rounded-2xl bg-white/8" />
                    ))}
                  </div>
                ) : null}

                {youtubeError ? (
                  <div className="mx-auto max-w-xl rounded-3xl bg-red-500/10 p-5 text-center text-sm font-black text-red-100">
                    {youtubeError}
                  </div>
                ) : null}

                {!youtubeLoading && !youtubeError && youtubeResults.length ? (
                  <>
                    <div className={`grid gap-3 ${
                      youtubeTab === "shorts"
                        ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-6"
                        : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
                    }`}>
                      {youtubeResults.map((video) => (
                        <button
                          key={video.videoId || video.id}
                          type="button"
                          onClick={() => openYoutubeVideoPreview(video)}
                          className="group overflow-hidden rounded-2xl bg-[#1f1f1f] text-left shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#292929]"
                        >
                          <div className={`relative overflow-hidden bg-black ${
                            youtubeTab === "shorts" ? "aspect-[9/16]" : "aspect-video"
                          }`}>
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title || "YouTube Video"}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><span className="vory-youtube-empty-play" aria-hidden="true" /></div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                            <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white">
                              oynat
                            </div>
                          </div>

                          <div className="p-3">
                            <h3 className="line-clamp-2 text-[13px] font-black leading-4 text-white">
                              {video.title}
                            </h3>
                            <p className="mt-1 truncate text-[11px] font-bold text-white/45">
                              {video.channelTitle || "YouTube"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div ref={youtubeFeedSentinelRef} className="flex min-h-[88px] justify-center py-7">
                      {youtubeNextPageToken ? (
                        <button
                          type="button"
                          onClick={loadMoreYoutubeResults}
                          disabled={youtubeLoadingMore}
                          className="rounded-full bg-white/12 px-6 py-3 text-sm font-black text-white transition hover:scale-[1.03] hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {youtubeLoadingMore ? "Yeni videolar yükleniyor..." : "Aşağı kaydırınca devam eder"}
                        </button>
                      ) : youtubeResults.length ? (
                        <span className="rounded-full bg-white/8 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white/42">
                          Akış sonu
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}
          </main>

          {youtubeSelectedVideo ? (
            <div className="absolute inset-x-0 bottom-14 z-20 flex justify-center px-3 pb-3">
              <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/12 bg-[#151515]/96 shadow-[0_-28px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
                <div className="grid gap-3 p-3 sm:grid-cols-[220px_1fr] sm:p-4">
                  <div className="relative overflow-hidden rounded-[1.35rem] bg-black aspect-video">
                    {youtubeSelectedVideo.thumbnail ? (
                      <img
                        src={youtubeSelectedVideo.thumbnail}
                        alt={youtubeSelectedVideo.title || "YouTube Video"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><span className="vory-youtube-empty-play" aria-hidden="true" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                      preview
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">YouTube Detail</p>
                        <button
                          type="button"
                          onClick={closeYoutubeVideoPreview}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-xl text-white/65 transition hover:bg-white/14 hover:text-white"
                          aria-label="Preview kapat"
                        >
                          ×
                        </button>
                      </div>

                      <h3 className="line-clamp-2 text-lg font-black leading-tight text-white">
                        {youtubeSelectedVideo.title || "YouTube Video"}
                      </h3>
                      <p className="mt-1 truncate text-sm font-bold text-white/45">
                        {youtubeSelectedVideo.channelTitle || "YouTube"}
                      </p>
                      {youtubeSelectedVideo.description ? (
                        <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-white/35">
                          {youtubeSelectedVideo.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => playYoutubePreviewNow(youtubeSelectedVideo)}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
                      >
                        <span className="vory-button-play-icon" aria-hidden="true" /> Play Now
                      </button>
                      <button
                        type="button"
                        onClick={() => addYoutubePreviewToQueue(youtubeSelectedVideo)}
                        className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:scale-[1.02] hover:bg-white/16"
                      >
                        + Queue
                      </button>
                      <button
                        type="button"
                        onClick={closeYoutubeVideoPreview}
                        className="col-span-2 rounded-2xl bg-black/35 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white/45 transition hover:bg-white/8 hover:text-white"
                      >
                        Back to search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <footer className="absolute bottom-0 left-0 right-0 grid h-14 grid-cols-3 border-t border-white/10 bg-black/55 text-[11px] font-black text-white/70 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setYoutubeTab("home")}
              className={`flex flex-col items-center justify-center gap-0.5 ${youtubeTab === "home" ? "text-white" : "text-white/45"}`}
            >
              <span className="text-lg">⌂</span>
              Ana Sayfa
            </button>
            <button
              type="button"
              onClick={() => {
                setYoutubeTab("shorts");
                if (!hasQuery) submitYoutubeSearch("shorts");
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${youtubeTab === "shorts" ? "text-white" : "text-white/45"}`}
            >
              <span className="text-lg">♬</span>
              Shorts
            </button>
            <button
              type="button"
              onClick={() => toast("Profil akışı sonra eklenecek knks")}
              className="flex flex-col items-center justify-center gap-0.5 text-white/45"
            >
              <span className="text-lg">☻</span>
              Siz
            </button>
          </footer>
        </div>
      </div>
    );
  }

  function renderRaveHomeFeed() {
    const visibleRooms = Array.isArray(discoveryRooms) ? discoveryRooms : [];
    const visibleInvitedRooms = Array.isArray(invitedDiscoveryRooms) ? invitedDiscoveryRooms : [];

    // Vory 5.4.7J: Invite alanı banner olarak geri gelmez.
    // Davetli odalar ayrı Davetli section'da görünür; public preview listesi aynı kalır.
    const invitedRooms = visibleInvitedRooms
      .filter((room) => room?.roomCode && Number(room?.userCount || 0) > 0)
      .slice(0, performanceMode ? 4 : 8);

    const invitedRoomCodes = new Set(invitedRooms.map((room) => String(room.roomCode || "").toUpperCase()));

    const allPublicRooms = visibleRooms
      .filter((room) => {
        const code = String(room?.roomCode || "").toUpperCase();
        return room?.isPublic && Number(room?.userCount || 0) > 0 && !invitedRoomCodes.has(code);
      });

    const publicRooms = allPublicRooms.slice(0, Math.max(4, discoveryRenderLimit));
    const hasMorePublicRooms = allPublicRooms.length > publicRooms.length;

    const handleRoomCardClick = (room) => {
      joinRoom(room.roomCode);
    };

    const getInitial = (value = "") => String(value || "V").trim().slice(0, 1).toUpperCase() || "V";

    const RoomAvatarStack = ({ room, privateRoom = false }) => {
      const usersList = Array.isArray(room.users) ? room.users : [];
      const fallbackUsers = usersList.length
        ? usersList
        : Array.from({ length: Math.min(5, Math.max(1, Number(room.userCount || 1))) }).map((_, index) => ({
            id: `${room.roomCode || "room"}-${index}`,
            username: index === 0 ? room.hostUsername || "Host" : "Vory",
            avatar: index === 0 ? room.hostAvatar || "" : "",
          }));

      const shownUsers = fallbackUsers.slice(0, 5);
      const extraCount = Math.max(0, Number(room.userCount || fallbackUsers.length || 0) - shownUsers.length);

      return (
        <div className="vory-rave-room-avatars" aria-label="Odada olan kullanıcılar">
          {shownUsers.map((user, index) => (
            <span
              key={user.id || `${room.roomCode || "room"}-${index}`}
              className="vory-rave-room-avatar"
              title={user.username || "Kullanıcı"}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.username || "Kullanıcı"} />
              ) : (
                <span>{getInitial(user.username || room.hostUsername)}</span>
              )}
            </span>
          ))}

          {extraCount > 0 ? (
            <span className="vory-rave-room-extra">+{extraCount}</span>
          ) : privateRoom ? (
            <span className="vory-rave-room-lock">🔒</span>
          ) : null}
        </div>
      );
    };

    const RoomCard = ({ room, privateRoom = false }) => {
      const roomTitle = room.mediaTitle || room.currentMedia?.title || "Vory Watch Party";
      const statusLabel = room.videoActive ? "LIVE" : privateRoom ? "PRIVATE" : "PUBLIC";
      const thumb = room.mediaThumbnail || room.currentMedia?.thumbnail || "";
      const hostName = room.hostUsername || room.host || "host";

      return (
        <button
          type="button"
          onClick={() => handleRoomCardClick(room)}
          className={`vory-rave-room-card vory-rave-room-card-oldwide group ${privateRoom ? "vory-rave-room-card-private" : "vory-rave-room-card-public"}`}
        >
          <div className="vory-rave-room-thumb">
            {thumb ? (
              <img src={thumb} alt={roomTitle} className="vory-rave-room-thumb-img" />
            ) : (
              <>
                <div className="vory-rave-room-thumb-glow" />
                <div className="vory-rave-room-thumb-fallback">v</div>
              </>
            )}
            <div className={`vory-rave-room-badge ${privateRoom ? "vory-rave-room-badge-private" : ""}`}>
              {privateRoom ? "INVITED" : statusLabel}
            </div>
          </div>

          <div className="vory-rave-room-info">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-black leading-tight text-white sm:text-lg">
                {roomTitle}
              </h3>
              <p className="mt-1 truncate text-xs font-bold text-white/48">
                @{hostName} {room.channelTitle ? `• ${room.channelTitle}` : ""}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <RoomAvatarStack room={room} privateRoom={privateRoom} />
              <span className="vory-rave-room-count">
                {Math.max(1, Number(room.userCount || 1))}
              </span>
            </div>
          </div>
        </button>
      );
    };

    const EmptyPublicState = () => (
      <div className="vory-rave-empty-public">
        <span className="text-3xl">🌐</span>
        <div className="min-w-0">
          <strong>Şu an public oda yok</strong>
          <small>+ ile YouTube seç, oda açılınca burada Rave gibi görünür.</small>
        </div>
      </div>
    );

    const PublicLoadingState = () => (
      <div className="vory-rave-empty-public">
        <span className="text-3xl">⏳</span>
        <div className="min-w-0">
          <strong>Aktif odalar yükleniyor</strong>
          <small>Public odalar hazırlanıyor, boş oda mesajı gösterilmiyor.</small>
        </div>
      </div>
    );

    return (
      <section className={`vory-rave-discovery-shell relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2.3rem] border border-white/8 p-5 pb-32 lg:p-8 ${performanceMode ? "bg-black/[0.14] shadow-[0_18px_60px_rgba(0,0,0,0.26)]" : "bg-black/[0.08] shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-sm"}`}>
        <div className="pointer-events-none absolute inset-0 bg-black/[0.06]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button type="button" onClick={() => toast("Menü lobbyde kalıyor. Oda ayarları sadece odaya girdikten sonra açılır.", { icon: "☰" })} className="text-5xl font-black leading-none text-white/90">☰</button>
            <h1 className="text-6xl font-black tracking-[-0.1em] text-white drop-shadow-xl sm:text-7xl">vory</h1>
            <div className="w-14" aria-hidden="true" />
          </div>

          <div className="vory-rave-search mb-6 flex items-center gap-3 rounded-[1.9rem] bg-black/40 px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <span className="text-4xl leading-none text-white">⌕</span>
            <input
              placeholder="Oda ara"
              className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-white/45"
              onFocus={() => refreshDiscoveryRooms()}
            />
          </div>

          <div className="space-y-7">
            {invitedRooms.length ? (
              <div className="vory-rave-section vory-rave-section-invited vory-rave-section-old">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 className="flex items-center gap-3 text-3xl font-black text-white"><span>🔒</span> Davetli</h2>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                    {invitedRooms.length} room
                  </span>
                </div>
                <div className="space-y-3">
                  {invitedRooms.map((room, index) => (
                    <RoomCard key={`private-${room.roomCode || index}`} room={room} privateRoom />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="vory-rave-section vory-rave-section-public vory-rave-section-old">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="flex items-center gap-3 text-3xl font-black text-white"><span>🌐</span> Herkese Açık</h2>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  {publicRooms.length} room
                </span>
              </div>
              <div className="space-y-3">
                {publicRooms.length ? publicRooms.map((room, index) => (
                  <RoomCard key={`public-${room.roomCode || index}`} room={room} />
                )) : <EmptyPublicState />}

                {hasMorePublicRooms ? (
                  <button
                    type="button"
                    onClick={() => setDiscoveryRenderLimit((prev) => prev + (performanceMode ? 4 : 6))}
                    className="vory-rave-load-more"
                  >
                    Daha fazla oda yükle
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* Vory 5.5.3E.3 REAL APPLY: Watch Party mini header stays visible in room. */
  function renderRoomHeroHeader(compact = false) {
    if (!roomCode) return null;

    const nowTitle = currentMedia?.title || (videoUrl ? normalizeHistoryTitle(videoUrl) : "Video bekleniyor");
    const voicePreview = (activeVoiceUsers || []).slice(0, 4);

    return (
      <section className={`vory-room-slim-bar vory-room-slim-bar-549 vory-rave-gap-room-header relative overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/30 shadow-[0_14px_55px_rgba(0,0,0,0.30)] backdrop-blur-2xl ${compact ? "px-3 py-2" : "px-3.5 py-2"}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(139,92,246,0.16),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(16,185,129,0.10),transparent_30%)]" />

        <div className="relative flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white text-base font-black text-black shadow-[0_12px_34px_rgba(255,255,255,0.14)]">
              V
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className={`${compact ? "text-base" : "text-lg"} truncate font-black tracking-[-0.055em] text-white`}>
                  Watch Party
                </h1>
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-emerald-400/14 px-2 text-[8px] font-black uppercase tracking-[0.13em] text-emerald-200">
                  Live
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] font-bold text-white/32">
                {isHost ? "Host sensin" : "Watch party"} • @{currentUserPayload.username || "vory"}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto xl:justify-end xl:pl-3">
            <span className="vory-now-playing-pill-549 inline-flex min-w-[170px] max-w-[560px] flex-1 items-center gap-2 rounded-full border border-white/8 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black text-white/72">
              <span className="shrink-0 text-emerald-200">▶</span>
              <span className="truncate">{nowTitle}</span>
            </span>

            {isHost ? (
              <button
                type="button"
                onClick={() => setCreateSheetOpen(true)}
                className="vory-room-platform-action inline-flex h-9 shrink-0 items-center rounded-full border border-violet-300/14 bg-violet-500/12 px-3 text-[10px] font-black text-violet-100 transition hover:bg-violet-500/20"
                title="Yeni video seç"
              >
                + Yeni video
              </button>
            ) : null}

            {voicePreview.length ? (
              <button
                type="button"
                onClick={() => setRightPanelTab("people")}
                className="hidden h-9 shrink-0 items-center rounded-full border border-emerald-300/10 bg-emerald-400/10 px-2.5 text-[10px] font-black text-emerald-100 sm:inline-flex"
                title="Room members"
              >
                <span className="flex -space-x-1.5">
                  {voicePreview.map((user, index) => {
                    const label = user.username || user.name || "V";
                    const speaking = Number(user.level || 0) > 14 && !user.muted;
                    return (
                      <span
                        key={user.socketId || user.id || label || index}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-[#12071f] text-[10px] font-black ${speaking ? "bg-emerald-300 text-black" : "bg-white/12 text-white"}`}
                      >
                        {String(label).charAt(0).toUpperCase()}
                      </span>
                    );
                  })}
                </span>
              </button>
            ) : null}

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
            Invite Link
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Arkadaşını partiye çağır
          </h2>
          <p className="mt-2 break-all rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/70">
            {getInviteLink()}
          </p>
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={copyInviteLink}>
          Copy Invite
        </button>
      </div>
    );
  }

  function renderDesktopMain() {
    if (!isAdminUser && appSection === "admin") {
      return null;
    }

    const renderDesktopSectionContent = () => {
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

      return null;
    };

    // Vory 5.4.8F: Lobby dışı navigation lock fix
    // Room yokken sidebar/profile/friends/settings tıklamaları lobby feed'e düşüyordu.
    // Önce aktif section içeriğini dene; sadece watch/boş içerikte Rave lobby feed renderla.
    if (!roomCode) {
      const sectionContent = renderDesktopSectionContent();

      if (sectionContent) {
        return sectionContent;
      }

      return renderRaveHomeFeed();
    }

    const watchVisible = appSection === "watch";

    return (
      <div className="space-y-3">
        <div className={watchVisible ? "vory-room-layout-549 vory-rave-gap-room-core grid min-h-[calc(100vh-7.25rem)] gap-3 xl:grid-cols-[minmax(0,1fr)_286px] 2xl:grid-cols-[minmax(0,1fr)_306px]" : "fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none"}>
          <section className="vory-room-main-549 flex min-h-0 flex-col gap-2 overflow-hidden xl:pr-1">
            {renderRoomHeroHeader(false)}
            <div className="vory-room-video-shell vory-room-video-shell-549 min-h-0 flex-1 overflow-hidden rounded-[1.45rem] border border-white/8 bg-black/14 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
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
                fullscreenChatToast={fullscreenChatToast}
              />
            </div>
          </section>

          <aside className={watchVisible ? "flex min-h-0 flex-col" : "fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none"}>
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
                onInviteClick={() => setRoomInvitePanelOpen(true)}
                typingUser={typingUser}
                onTyping={handleTyping}
                users={users}
                currentUser={currentUserPayload}
                onlinePresence={onlinePresence}
                currentSocketId={socket.id}
                currentRoomCode={roomCode}
                inviteCooldowns={inviteCooldowns}
                dmUnread={dmUnread}
                activeDM={activeDM}
                dmLastMessages={dmLastMessages}
                voiceUsers={activeVoiceUsers}
                voiceSlot={
                  <VoiceChat
                    compact
                    roomCode={roomCode}
                    username={currentUserPayload.username}
                    onReaction={sendReaction}
                    onVoiceUsersChange={setVoiceRoster}
                    hostMuteAll={!!roomSettings?.muteAll}
                  />
                }
                onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
                onInviteFriend={sendPartyInvite}
                onOpenDM={openDM}
              />
            </aside>
        </div>

        {!watchVisible && renderDesktopSectionContent()}
      </div>
    );
  }

  function renderVoiceAvatarRow(compact = false) {
    if (!roomCode) return null;

    const rowUsers = activeVoiceUsers || [];

    if (!rowUsers.length) {
      return (
        <div className={`flex items-center justify-between gap-3 rounded-full border border-white/8 bg-black/20 px-3 py-2.5 backdrop-blur-xl ${compact ? "" : ""}`}>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-sm">
              🎙
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black text-white/65">Voice empty</p>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/28">Chat yanındaki mic ile katıl</p>
            </div>
          </div>
          <span className="rounded-full bg-white/7 px-2.5 py-1 text-[10px] font-black text-white/40">
            0 online
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 overflow-x-auto rounded-full border border-emerald-300/12 bg-black/28 px-2.5 py-2 backdrop-blur-xl shadow-[0_16px_50px_rgba(16,185,129,0.08)] ${compact ? "" : ""}`}>
        <span className="sticky left-0 z-10 mr-1 shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-xl">
          Voice • {rowUsers.length}
        </span>

        {rowUsers.map((user, index) => {
          const level = Number(user.level || 0);
          const speaking = level > 14 && !user.muted;
          const muted = !!user.muted;
          const label = user.username || user.name || "Kullanıcı";
          const initial = String(label).charAt(0).toUpperCase();

          return (
            <div
              key={user.socketId || user.id || user.userId || label || index}
              className={`group flex min-w-fit items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all duration-150 ${
                speaking
                  ? "scale-[1.05] border-emerald-300/55 bg-emerald-400/20 text-emerald-50 shadow-[0_0_36px_rgba(52,211,153,0.42)]"
                  : muted
                    ? "border-amber-300/20 bg-amber-400/10 text-amber-50"
                    : "border-white/8 bg-white/[0.055] text-white/70"
              }`}
              title={`${label}${muted ? " • muted" : speaking ? " • speaking" : " • in voice"}`}
            >
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-black transition-all ${
                speaking
                  ? "animate-pulse bg-emerald-300 text-black ring-4 ring-emerald-300/20"
                  : muted
                    ? "bg-amber-300/18 text-amber-100"
                    : "bg-white/10 text-white"
              }`}>
                {initial}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#10071f] ${
                  muted ? "bg-amber-300" : speaking ? "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)]" : "bg-white/35"
                }`} />
              </div>

              <div className="min-w-0 pr-1">
                <p className="max-w-[96px] truncate text-[11px] font-black leading-none">{label}</p>
                <p className={`mt-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                  muted ? "text-amber-200/85" : speaking ? "text-emerald-100" : "text-white/34"
                }`}>
                  {muted ? "Muted" : speaking ? "Speaking" : "In voice"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

    function renderMobilePanel() {
    const mobileSectionMap = {
      room: "settings",
      settings: "settings",
      people: "friends",
      friends: "friends",
      voice: "watch",
      chat: "watch",
      dm: "friends",
      social: "friends",
      discover: "watch",
      screen: "watch",
      admin: "settings",
    };
    const mobileSection = mobileSectionMap[activeMobileTab] || activeMobileTab || "watch";

    const renderMobileWatchRoom = (hidden = false) => (
      <section
        className={`vory-mobile-rave-room vory-rave-gap-mobile-room flex min-w-0 flex-col gap-2 pb-28 ${hidden ? "vory-mobile-persistent-media-hidden" : ""}`}
        aria-hidden={hidden ? "true" : undefined}
      >
        {renderRoomHeroHeader(true)}

        <div className="vory-mobile-rave-split vory-rave-gap-mobile-split">
          <div className="vory-room-video-shell vory-mobile-rave-video rounded-[1.45rem] border border-white/8 bg-black/14 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
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
              fullscreenChatToast={fullscreenChatToast}
            />
          </div>

          <VoryRightPanel
            mobile
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
            onInviteClick={() => setRoomInvitePanelOpen(true)}
            typingUser={typingUser}
            onTyping={handleTyping}
            users={users}
            currentUser={currentUserPayload}
            voiceUsers={activeVoiceUsers}
            voiceSlot={
              <VoiceChat
                compact
                roomCode={roomCode}
                username={currentUserPayload.username}
                onReaction={sendReaction}
                onVoiceUsersChange={setVoiceRoster}
                hostMuteAll={!!roomSettings?.muteAll}
              />
            }
          />
        </div>
      </section>
    );

    const renderMobileFriends = () => (
      <section className="flex min-w-0 flex-col gap-4 pb-28">
        <div className="rounded-[2rem] border border-white/10 bg-black/24 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-200/50">People</p>
              <h2 className="mt-1 text-2xl font-black text-white">Room Members</h2>
            </div>
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-black text-white/65">
              👥 {users.length || 0}
            </span>
          </div>
          <UserList users={users} voiceUsers={activeVoiceUsers} />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/24 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/50">Online</p>
            <h2 className="mt-1 text-2xl font-black text-white">Friends Online</h2>
          </div>
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
        </div>

        <details className="rounded-[2rem] border border-white/10 bg-black/18 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <summary className="cursor-pointer list-none rounded-[1.5rem] bg-white/[0.06] px-4 py-3 text-sm font-black text-white/80">
            Friend Requests / Search
          </summary>
          <div className="mt-3">
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
          </div>
        </details>
      </section>
    );

    const renderMobileProfile = () => (
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

    const renderMobileRoomSettings = () => (
      <section className="flex min-w-0 flex-col gap-4 pb-28">
        <div className="rounded-[2rem] border border-white/10 bg-black/24 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-200/50">Room Hub</p>
          <h2 className="mt-1 text-2xl font-black text-white">{roomCode ? `Room ${roomCode}` : "Join a room"}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-white/42">
            Oda kodu, üyeler, voice ve davet linki tek yerde.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.045] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Members</p>
              <p className="mt-1 text-xl font-black text-white">{users.length || 0}</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-300/10 bg-emerald-400/8 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/45">Voice</p>
              <p className="mt-1 text-xl font-black text-emerald-100">{liveVoiceCount}</p>
            </div>
          </div>

          {!roomCode ? (
            <div className="mt-4 space-y-2">
              <input
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
                placeholder="ODA KODU"
                className="h-14 w-full rounded-[1.5rem] border border-white/10 bg-black/24 px-5 text-sm font-black uppercase tracking-[0.18em] text-white outline-none placeholder:text-white/28 focus:border-violet-300/40"
              />
              <button
                type="button"
                onClick={() => joinRoom()}
                className="h-14 w-full rounded-[1.5rem] border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
              >
                Join
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={copyInviteLink}
                className="rounded-[1.5rem] border border-violet-300/15 bg-violet-500/12 px-4 py-3 text-sm font-black text-violet-50"
              >
                Invite Link
              </button>
            </div>
          )}
        </div>

        <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
      </section>
    );

    if (!roomCode) {
      if (mobileSection === "profile") return renderMobileProfile();
      if (mobileSection === "friends") return renderMobileFriends();
      if (mobileSection === "settings") return renderMobileRoomSettings();

      return (
        <section className="pb-28">
          {renderRaveHomeFeed()}
        </section>
      );
    }

    if (mobileSection === "watch") {
      return renderMobileWatchRoom(false);
    }

    return (
      <>
        {renderMobileWatchRoom(true)}
        {mobileSection === "friends" ? renderMobileFriends() : null}
        {mobileSection === "profile" ? renderMobileProfile() : null}
        {mobileSection !== "friends" && mobileSection !== "profile" ? renderMobileRoomSettings() : null}
      </>
    );
  }

  function renderGlobalFullscreenChatOverlay() {
    if (!fullscreenChatToast) return null;

    const initial = String(fullscreenChatToast.sender || "V").trim().charAt(0).toUpperCase() || "V";

    return (
      <div className="vory-fullscreen-chat-overlay vory-fullscreen-chat-overlay-global" key={fullscreenChatToast.id}>
        {fullscreenChatToast.avatar ? (
          <img src={fullscreenChatToast.avatar} alt="avatar" />
        ) : (
          <span className="vory-fullscreen-chat-avatar">{initial}</span>
        )}
        <div className="min-w-0">
          <strong>{fullscreenChatToast.sender || "Misafir"}</strong>
          <span>{fullscreenChatToast.message || "Yeni mesaj"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-voryapp min-h-screen overflow-x-hidden text-white ${roomCode ? "vory-has-active-room" : "vory-has-home-feed"}`}>
      <AnimatedBackground theme="voryapp" performanceMode={performanceMode} lobbyMode={!roomCode} />
      {renderGlobalFullscreenChatOverlay()}

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
          performanceMode={performanceMode}
          onOpenFeedback={() => {
            try {
              window.dispatchEvent(new CustomEvent("vory-open-feedback"));
            } catch {}
          }}
        />

        <div className={`flex min-w-0 flex-1 flex-col ${roomCode ? "gap-2" : "gap-3"}`}>
          <VoryTopBar
            authUser={authUser}
            onLogout={handleLogoutCleanup}
            isHost={isHost}
            roomCode={roomCode}
            onLeaveRoom={leaveRoom}
            userCount={users.length}
            watchingCount={liveWatchingCount}
            voiceCount={liveVoiceCount}
            connectionStatus={connectionStatus}
            lastRestoreMessage=""
            hostTransferMessage={hostTransferMessage}
            onRestore={undefined}
            notifications={notifications}
            onMarkNotificationsRead={markNotificationsRead}
            onClearNotifications={clearNotifications}
            onNotificationClick={handleNotificationClick}
          />

          {pendingInviteRoom && !roomCode && (
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
              </div>

              {pendingInviteRoom ? (
                <button className="btn-primary w-full sm:w-auto" onClick={joinPendingInvite}>
                  Tekrar Katıl
                </button>
              ) : null}
            </div>
          )}

          {isDesktopViewport ? (
            <main className="min-h-0 flex-1">
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
                  className="fixed bottom-24 right-6 z-[80] flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl font-black leading-none text-black shadow-[0_18px_70px_rgba(255,255,255,0.24)] transition hover:scale-105 active:scale-95"
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
                />
              )}
            </main>
          ) : (
            <main className="flex-1">
              <div className="mobile-stage space-y-4">
                {renderMobilePanel()}
              </div>
            </main>
          )}

          {renderDMPanel()}
      {renderRoomInvitePanel()}
          {renderPlatformSheet()}
          {renderYouTubeBrowser()}

          <FeedbackWidget
            authUser={authUser}
            roomCode={roomCode}
            connectionStatus={connectionStatus}
            hideFloating={true}
          />

          {appSection === "watch" && !roomCode && (
            <button
              type="button"
              onClick={handleCreateRoomFlow}
              className="fixed bottom-44 right-5 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl font-black leading-none text-black shadow-[0_18px_70px_rgba(255,255,255,0.24)] transition hover:scale-105 active:scale-95 lg:hidden"
              title="Oda oluştur"
              aria-label="Oda oluştur"
            >
              +
            </button>
          )}

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
