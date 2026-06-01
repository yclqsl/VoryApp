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

export default function Home({ authUser, onLogout }) {
  const [username, setUsername] = useState(authUser?.username || "");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
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

      ignoreEventRef.current = true;
      playerRef.current.seekTo(currentTime, true);

      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();

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

    if (!videoUrl.trim()) {
      toast.error("YouTube linki gir");
      return;
    }

    socket.emit("set-video", { roomCode, videoUrl });
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2a1160,#08080b_45%)] p-5 text-white">
      <div className="flex gap-5">
        <LeftSidebar />

        <div className="min-w-0 flex-1">
          <Header authUser={authUser} onLogout={onLogout} isHost={isHost} />

          {pendingInviteRoom && !roomCode && (
            <div className="glass mt-5 flex items-center justify-between gap-4 border-violet-400/30">
              <div>
                <p className="text-sm text-white/40">Davet linki algılandı</p>
                <h2 className="text-xl font-black text-emerald-300">
                  {pendingInviteRoom} odasına katılmaya hazırsın
                </h2>
              </div>

              <button className="btn mt-0 w-auto px-6" onClick={joinPendingInvite}>
                Odaya Katıl
              </button>
            </div>
          )}

          <main className="mt-5 grid h-[calc(100vh-124px)] grid-cols-[minmax(0,1fr)_410px] gap-5 max-xl:h-auto max-xl:grid-cols-1">
            <div className="flex min-h-0 flex-col gap-5">
              <VideoPlayer
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                onSetVideo={setRoomVideo}
                onVideoControl={handleVideoControl}
                onVideoSeek={handleVideoSeek}
                playerRef={playerRef}
                ignoreEventRef={ignoreEventRef}
                isHost={isHost}
              />

              <QuickActions roomCode={roomCode} isHost={isHost} />
            </div>

            <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
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
			  
			  <ProfileCard authUser={authUser} />

              <UserList users={users} />

              <FriendPanel />

              <ChatPanel
                messages={messages}
                message={message}
                setMessage={setMessage}
                onSendMessage={sendMessage}
              />
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
