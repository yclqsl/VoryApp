import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";
import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import QuickActions from "../components/QuickActions";
import RoomPanel from "../components/RoomPanel";
import InviteBox from "../components/InviteBox";
import FriendPanel from "../components/FriendPanel";
import UserList from "../components/UserList";
import ChatPanel from "../components/ChatPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProfileCard from "../components/ProfileCard";
import VoiceChat from "../components/VoiceChat";
import ScreenShare from "../components/ScreenShare";

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

  useEffect(() => {
    window.currentRoomCode = roomCode;
  }, [roomCode]);

  const playerRef = useRef(null);
  const ignoreEventRef = useRef(false);

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

    socket.on("video-sync", ({ isPlaying, currentTime }) => {
      if (!playerRef.current) return;

      const localTime = playerRef.current.getCurrentTime?.() || 0;
      const localState = playerRef.current.getPlayerState?.();
      const drift = Math.abs(localTime - (currentTime || 0));

      ignoreEventRef.current = true;

      // Rave tarzı yumuşak senkron:
      // Küçük farklarda seek yapma, yoksa video sürekli takılır.
      if (drift > 2.5) {
        playerRef.current.seekTo(currentTime || 0, true);
      }

      // Sadece oynatma durumu farklıysa play/pause uygula.
      if (isPlaying && localState !== 1) {
        playerRef.current.playVideo();
      }

      if (!isPlaying && localState === 1) {
        playerRef.current.pauseVideo();
      }

      setTimeout(() => {
        ignoreEventRef.current = false;
      }, 700);
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

    return () => {
      socket.off("room-created");
      socket.off("room-joined");
      socket.off("room-left");
      socket.off("room-users");
      socket.off("video-updated");
      socket.off("video-control");
      socket.off("video-seek");
      socket.off("video-sync");
      socket.off("receive-message");
      socket.off("system-message");
      socket.off("room-error");
    };
  }, []);

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

  return (
    <div className="app-shell min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-10 top-20 h-96 w-96 rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-indigo-700/15 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen gap-5 p-4 lg:p-5">
        <LeftSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
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

          <main className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="flex min-w-0 flex-col gap-5">
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

              <QuickActions roomCode={roomCode} isHost={isHost} userCount={users.length} />
            </section>

            <aside className="right-rail">
              <ProfileCard authUser={authUser} />

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

              <VoiceChat roomCode={roomCode} username={currentUserPayload.username} />

              <UserList users={users} />

              <InviteBox roomCode={roomCode} />

              <ChatPanel
                messages={messages}
                message={message}
                setMessage={setMessage}
                onSendMessage={sendMessage}
              />

              <FriendPanel />
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
