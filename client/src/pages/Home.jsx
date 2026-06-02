import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";
import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
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
import VoryPanelTabs from "../components/VoryPanelTabs";

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
  const [desktopPanelTab, setDesktopPanelTab] = useState("chat");
  const [onlinePresence, setOnlinePresence] = useState([]);

  useEffect(() => {
    window.currentRoomCode = roomCode;
  }, [roomCode]);

  const playerRef = useRef(null);
  const ignoreEventRef = useRef(false);
  const syncIntervalRef = useRef(null);
  const pulseLockRef = useRef(false);
  const lastSoftSyncRef = useRef(0);

  const currentUserPayload = {
    username: username || authUser?.username || "Misafir",
    avatar: authUser?.avatar || "",
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedRoom = params.get("room");

    if (invitedRoom) {
      const cleanRoom = invitedRoom.trim().toUpperCase();
      setRoomInput(cleanRoom);
      setPendingInviteRoom(cleanRoom);
      toast.success(`Davet odası hazır: ${cleanRoom}`);
    }
  }, []);

  useEffect(() => {
    socket.on("room-created", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Oda oluşturuldu.");
      toast.success("Oda oluşturuldu 🚀");
    });

    socket.on("room-joined", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Odaya katıldın.");
      toast.success("Odaya katıldın 🎉");
    });

    socket.on("room-left", () => {
      setRoomCode("");
      setUsers([]);
      setMessages([]);
      setVideoUrl("");
      setStatus("");
      setIsHost(false);
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

    return () => {
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
      socket.off("system-message");
      socket.off("room-error");
      socket.off("online-users");
      socket.off("presence-changed");
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

  function setRoomVideo() {
    if (!roomCode) {
      toast.error("Önce odaya gir");
      return;
    }

    if (!videoInput.trim()) {
      toast.error("YouTube linki gir");
      return;
    }

    socket.emit("set-video", { roomCode, videoUrl: videoInput.trim() });
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



  function renderDesktopPanel() {
    if (desktopPanelTab === "chat") {
      return (
        <ChatPanel
          messages={messages}
          message={message}
          setMessage={setMessage}
          onSendMessage={sendMessage}
        />
      );
    }

    if (desktopPanelTab === "voice") {
      return (
        <>
          <VoiceChat roomCode={roomCode} username={currentUserPayload.username} />
          <UserList users={users} />
        </>
      );
    }

    if (desktopPanelTab === "room") {
      return (
        <>
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

          <InviteBox roomCode={roomCode} />

          <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
        </>
      );
    }

    return (
      <PresenceFriendPanel
        onlineUsers={onlinePresence}
        currentSocketId={socket.id}
        onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
      />
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

          <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
        </section>
      );
    }

    return (
      <section className="flex min-w-0 flex-col gap-4">
        <ProfileCard authUser={authUser} />
        <PresenceFriendPanel
          onlineUsers={onlinePresence}
          currentSocketId={socket.id}
          onJoinRoom={(targetRoomCode) => joinRoom(targetRoomCode)}
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

      <div className="relative flex min-h-screen gap-4 p-3 pb-24 sm:p-4 sm:pb-24 lg:gap-5 lg:p-5">
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
          <Header
            authUser={authUser}
            onLogout={onLogout}
            isHost={isHost}
            roomCode={roomCode}
            userCount={users.length}
          />

          {pendingInviteRoom && !roomCode && (
            <div className="glass-panel flex flex-col gap-4 border-emerald-400/25 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300/70">
                  Davet Linki Algılandı
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {pendingInviteRoom} odasına katılmaya hazırsın
                </h2>
              </div>

              <button className="btn-primary w-full sm:w-auto" onClick={joinPendingInvite}>
                Odaya Katıl
              </button>
            </div>
          )}

          <main className="hidden flex-1 gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className="flex min-w-0 flex-col gap-4">
              <div className="vory-hero-panel">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-violet-200/55">
                      Vory Watch Party
                    </p>
                    <h1 className="mt-1 text-2xl font-black text-white xl:text-3xl">
                      Birlikte izle, konuş, paylaş
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                    {roomCode ? `ROOM ${roomCode}` : "LOBBY"}
                  </div>
                </div>

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

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <ScreenShare roomCode={roomCode} username={currentUserPayload.username} />

                <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
              </div>
            </section>

            <aside className="vory-command-panel">
              <ProfileCard authUser={authUser} />

              <VoryPanelTabs
                activeTab={desktopPanelTab}
                onChange={setDesktopPanelTab}
                messageCount={messages.length}
                onlineCount={onlinePresence.length}
                userCount={users.length}
              />

              <div className="flex min-h-0 flex-col gap-4">
                {renderDesktopPanel()}
              </div>
            </aside>
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
