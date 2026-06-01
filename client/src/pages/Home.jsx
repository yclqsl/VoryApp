import { useEffect, useRef, useState } from "react";
import { Globe2, Plus, Search, Users, Play, Lock, LogOut, Sparkles } from "lucide-react";
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

function RoomAvatarStack({ users = [], count = 0 }) {
  const shown = users.slice(0, 5);

  return (
    <div className="flex items-center">
      {shown.map((user, index) => (
        <div
          key={user.id || index}
          className="-ml-2 first:ml-0"
          title={user.username}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt="avatar"
              className="h-9 w-9 rounded-full border-2 border-[#13091f] object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#13091f] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-black">
              {(user.username || "V").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}

      {count > shown.length && (
        <div className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#13091f] bg-red-500 text-xs font-black">
          +{count - shown.length}
        </div>
      )}
    </div>
  );
}

function PublicRoomCard({ room, onJoin }) {
  return (
    <button
      type="button"
      onClick={() => onJoin(room.roomCode)}
      className="group flex w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.11]"
    >
      <div className="relative h-36 w-40 shrink-0 overflow-hidden bg-black sm:w-52">
        {room.thumbnail ? (
          <img
            src={room.thumbnail}
            alt={room.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-700/70 to-fuchsia-700/60">
            <Play size={42} className="text-white/70" />
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-xl bg-black/65 p-2 backdrop-blur">
          <Play size={17} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
              PUBLIC
            </span>
            {room.isPlaying && (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-black text-red-300">
                LIVE
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-lg font-black leading-tight text-white">
            {room.title}
          </h3>
          <p className="mt-1 text-sm text-white/45">Host: @{room.host}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <RoomAvatarStack users={room.users} count={room.userCount} />

          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white">
            +{room.userCount}
          </span>
        </div>
      </div>
    </button>
  );
}

function PublicRoomsLobby({
  authUser,
  onLogout,
  publicRooms,
  onCreateRoom,
  onJoinRoom,
  roomInput,
  setRoomInput,
  pendingInviteRoom,
  joinPendingInvite,
}) {
  const [search, setSearch] = useState("");

  const filteredRooms = publicRooms.filter((room) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    return (
      room.title?.toLowerCase().includes(keyword) ||
      room.host?.toLowerCase().includes(keyword) ||
      room.roomCode?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="rave-mobile-shell min-h-screen text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col px-4 pb-24 pt-5">
        <header className="flex items-center justify-between">
          <button
            onClick={onLogout}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/70"
            title="Çıkış"
          >
            <LogOut size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">
              r<span className="text-violet-200">Λ</span>ve
            </h1>
            <p className="text-xs text-white/45">VoryApp Rooms</p>
          </div>

          <div className="relative">
            {authUser?.avatar ? (
              <img
                src={authUser.avatar}
                alt="avatar"
                className="h-12 w-12 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
                {(authUser?.username || "V").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#13091f] bg-emerald-400" />
          </div>
        </header>

        <section className="mt-8">
          <div className="flex items-center gap-3">
            <Globe2 size={44} className="text-white" />
            <div>
              <h2 className="text-4xl font-black">Public</h2>
              <p className="text-sm text-white/45">Açık odalara katıl veya kendi odanı aç.</p>
            </div>
          </div>

          {pendingInviteRoom && (
            <div className="mt-5 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300/70">
                Davet algılandı
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <strong className="text-xl">{pendingInviteRoom}</strong>
                <button className="btn-primary mt-0 w-auto px-5" onClick={joinPendingInvite}>
                  Katıl
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                className="input mt-0 pl-11"
                placeholder="Oda, host veya kod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              onClick={onCreateRoom}
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-white text-black shadow-2xl shadow-white/20 transition hover:scale-105"
              title="Oda oluştur"
            >
              <Plus size={28} />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="input mt-0"
              placeholder="Oda kodu ile katıl..."
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
            />
            <button
              className="btn-primary mt-0 w-auto px-5"
              onClick={() => onJoinRoom()}
            >
              Katıl
            </button>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {filteredRooms.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 text-center">
              <Sparkles size={42} className="mx-auto text-violet-300" />
              <h3 className="mt-3 text-2xl font-black">Henüz public oda yok</h3>
              <p className="mt-2 text-sm text-white/45">
                İlk odayı sen oluştur, arkadaşların listeye düşsün.
              </p>
              <button className="btn-primary mt-5" onClick={onCreateRoom}>
                Oda Oluştur
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <PublicRoomCard key={room.roomCode} room={room} onJoin={onJoinRoom} />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default function Home({ authUser, onLogout }) {
  const [username, setUsername] = useState(authUser?.username || "");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
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
    socket.emit("get-public-rooms");

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
    socket.on("public-rooms", (rooms) => {
      setPublicRooms(rooms || []);
    });

    socket.on("room-created", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Oda oluşturuldu.");
      toast.success("Oda oluşturuldu 🚀");
      socket.emit("get-public-rooms");
    });

    socket.on("room-joined", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPendingInviteRoom("");
      setStatus("Odaya katıldın.");
      toast.success("Odaya katıldın 🎉");
      socket.emit("get-public-rooms");
    });

    socket.on("room-left", () => {
      setRoomCode("");
      setUsers([]);
      setMessages([]);
      setVideoUrl("");
      setStatus("");
      setIsHost(false);
      socket.emit("get-public-rooms");
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
      socket.off("public-rooms");
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

  if (!roomCode) {
    return (
      <PublicRoomsLobby
        authUser={authUser}
        onLogout={onLogout}
        publicRooms={publicRooms}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        roomInput={roomInput}
        setRoomInput={setRoomInput}
        pendingInviteRoom={pendingInviteRoom}
        joinPendingInvite={joinPendingInvite}
      />
    );
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
