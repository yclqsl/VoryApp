import { Copy, DoorOpen, Link, LogOut, PlusCircle, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

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
  compact = false,
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
      const fallbackLink = roomCode ? `${window.location.origin}/room/${roomCode}` : "";
      if (fallbackLink) {
        await navigator.clipboard.writeText(fallbackLink);
        toast.success("Davet linki kopyalandı 🔗");
        return;
      }
      toast.error(error.response?.data?.message || "Davet linki oluşturulamadı.");
    }
  }

  if (compact) {
    return (
      <section className="mt-2 rounded-[1.75rem] border border-white/10 bg-black/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/70">
                Room Control
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/7 px-2.5 py-1 text-[11px] font-black text-white/45">
                <Radio size={12} /> {roomCode ? roomCode : "Lobby"}
              </span>
            </div>
            <h2 className="mt-2 truncate text-base font-black text-white">
              {roomCode ? "Watch party hazır" : "Yeni watch party başlat"}
            </h2>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[620px]">
            <input
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/35"
              placeholder="Oda kodu"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
            />
            <button className="h-11 rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:scale-[1.02]" onClick={roomCode ? copyInviteLink : onCreateRoom}>
              {roomCode ? <span className="inline-flex items-center gap-2"><Link size={16} /> Invite</span> : <span className="inline-flex items-center gap-2"><PlusCircle size={16} /> Oluştur</span>}
            </button>
            {roomCode ? (
              <button className="h-11 rounded-2xl border border-red-300/15 bg-red-500/12 px-4 text-sm font-black text-red-200" onClick={onLeaveRoom}>
                <span className="inline-flex items-center gap-2"><LogOut size={16} /> Ayrıl</span>
              </button>
            ) : (
              <button className="h-11 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-white/75" onClick={onJoinRoom}>
                <span className="inline-flex items-center gap-2"><DoorOpen size={16} /> Katıl</span>
              </button>
            )}
          </div>
        </div>

        {status ? <p className="mt-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/40">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200/55">Room Control</p>
          <h2 className="mt-1 text-xl font-black text-white">Watch party ayarları</h2>
          <p className="mt-1 text-sm font-bold text-white/40">Oda oluştur, katıl ve davet linkini paylaş.</p>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/45">{roomCode || "Lobby"}</span>
      </div>

      <div className="mt-5">
        <input className="input mt-0" placeholder="Oda kodu" value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <button className="btn mt-0 flex items-center justify-center gap-2" onClick={onCreateRoom}><PlusCircle size={17} /> Oluştur</button>
        <button className="btn-secondary mt-0 flex items-center justify-center gap-2" onClick={onJoinRoom}><DoorOpen size={17} /> Katıl</button>
        <button className="btn-secondary mt-0 flex items-center justify-center gap-2" onClick={roomCode ? copyInviteLink : copyRoomCode} disabled={!roomCode}><Link size={17} /> Invite</button>
        <button className="rounded-2xl bg-red-500/12 px-4 py-3 font-black text-red-200 disabled:opacity-40" onClick={onLeaveRoom} disabled={!roomCode}><LogOut size={17} className="inline" /> Ayrıl</button>
      </div>
    </section>
  );
}
