import { Copy, Link, LogOut, Radio, PlusCircle, DoorOpen } from "lucide-react";
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Davet linki kopyalandı 🔗");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Davet linki oluşturulamadı."
      );
    }
  }

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Oda Kontrol</h2>
          <p className="text-xs text-white/35">Oluştur, katıl ve davet et.</p>
        </div>

        <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300">
          <Radio size={13} />
          Live
        </span>
      </div>

      <input
        className="input"
        placeholder="Kullanıcı adın"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <button className="btn flex items-center gap-2" onClick={onCreateRoom}>
          <PlusCircle size={17} />
          Oluştur
        </button>

        <button className="btn-secondary flex items-center gap-2" onClick={onJoinRoom}>
          <DoorOpen size={17} />
          Katıl
        </button>
      </div>

      <input
        className="input"
        placeholder="Oda kodu"
        value={roomInput}
        onChange={(e) => setRoomInput(e.target.value)}
      />

      {roomCode && (
        <>
          <div className="mt-4 rounded-3xl border border-emerald-400/10 bg-emerald-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300/70">
              Aktif Oda
            </p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <strong className="text-2xl font-black text-emerald-300">{roomCode}</strong>

              <button
                className="btn-secondary mt-0 w-auto px-4"
                onClick={copyRoomCode}
                title="Oda kodunu kopyala"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          <button
            className="btn-secondary flex items-center justify-center gap-2"
            onClick={copyInviteLink}
          >
            <Link size={18} />
            Davet Linkini Kopyala
          </button>

          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/15 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/25"
            onClick={onLeaveRoom}
          >
            <LogOut size={18} />
            Odadan Ayrıl
          </button>
        </>
      )}

      {status && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-white/50">{status}</p>}
    </section>
  );
}
