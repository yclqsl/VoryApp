import { Copy, DoorOpen, Link, LogOut, PlusCircle, Radio, Settings2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

const themeOptions = [
  { id: "neon", label: "Neon", icon: "💜" },
  { id: "cinema", label: "Cinema", icon: "🎬" },
  { id: "galaxy", label: "Galaxy", icon: "🌌" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
];

export default function RoomPanel({
  username,
  setUsername,
  roomInput,
  setRoomInput,
  roomCode,
  status,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isHost = false,
  activeTheme = "neon",
  onThemeChange,
}) {
  async function copyRoomCode() {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast.success("Oda kodu kopyalandı 🚀");
  }

  async function copyInviteLink() {
    try {
      if (!roomCode) {
        toast.error("Önce oda oluştur veya odaya katıl.");
        return;
      }

      const token = localStorage.getItem("vory_token");
      const { data } = await api.post(
        "/invites/room-link",
        { roomCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Davet linki kopyalandı 🔗");
    } catch (error) {
      toast.error(error.response?.data?.message || "Davet linki oluşturulamadı.");
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/30 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-violet-200/55">
            Premium Room Control
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            {roomCode ? `Room ${roomCode}` : "Yeni watch party başlat"}
          </h2>
          <p className="mt-1 text-xs font-bold text-white/38">
            Oda oluştur, koda katıl, link paylaş ve temayı yönet.
          </p>
        </div>

        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${roomCode ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/45"}`}>
          <Radio size={13} /> {roomCode ? "Live" : "Lobby"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <input
          className="input mt-0"
          placeholder="Görünen ad"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="input mt-0 uppercase"
          placeholder="Oda kodu"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button className="btn mt-0 flex items-center justify-center gap-2" onClick={onCreateRoom}>
          <PlusCircle size={17} /> Oluştur
        </button>

        <button className="btn-secondary mt-0 flex items-center justify-center gap-2" onClick={onJoinRoom}>
          <DoorOpen size={17} /> Katıl
        </button>

        <button className="btn-secondary mt-0 flex items-center justify-center gap-2" onClick={copyInviteLink} disabled={!roomCode}>
          <Link size={17} /> Invite
        </button>

        <button className="mt-0 flex items-center justify-center gap-2 rounded-2xl bg-red-500/12 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-40" onClick={onLeaveRoom} disabled={!roomCode}>
          <LogOut size={17} /> Ayrıl
        </button>
      </div>

      {roomCode ? (
        <div className="mt-4 rounded-[1.5rem] border border-emerald-300/12 bg-emerald-400/8 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">Aktif Oda</p>
              <strong className="mt-1 block text-2xl font-black text-emerald-200">{roomCode}</strong>
            </div>
            <button className="btn-secondary mt-0 w-auto px-4" onClick={copyRoomCode} title="Oda kodunu kopyala">
              <Copy size={18} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/45">
            <Settings2 size={14} /> Room Theme
          </p>
          {!isHost && roomCode ? <span className="text-[10px] font-black text-white/30">Sadece host</span> : null}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {themeOptions.map((theme) => {
            const active = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                disabled={!roomCode || !isHost}
                onClick={() => onThemeChange?.(theme.id)}
                className={`rounded-2xl border px-2 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  active
                    ? "border-violet-300/35 bg-violet-500/20 text-white shadow-[0_0_24px_rgba(139,92,246,0.18)]"
                    : "border-white/8 bg-black/20 text-white/45 hover:bg-white/8"
                }`}
              >
                <span className="mb-1 block text-base">{theme.icon}</span>
                {theme.label}
              </button>
            );
          })}
        </div>
      </div>

      {status ? (
        <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/45">
          <Sparkles className="mr-2 inline" size={14} /> {status}
        </p>
      ) : null}
    </section>
  );
}
