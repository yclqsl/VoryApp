import { Copy, Link, LogOut, Radio } from "lucide-react";
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
        <h2 className="text-lg font-black">Oda Kontrol</h2>

        <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-300">
          <Radio size={13} />
          Live Room
        </span>
      </div>

      <input
        className="input"
        placeholder="Kullanıcı adın"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <button className="btn" onClick={onCreateRoom}>
        Oda Oluştur
      </button>

      <input
        className="input"
        placeholder="Oda kodu"
        value={roomInput}
        onChange={(e) => setRoomInput(e.target.value)}
      />

      <button className="btn-secondary" onClick={onJoinRoom}>
        Odaya Katıl
      </button>

      {roomCode && (
        <>
          <div className="mt-4 rounded-2xl bg-black/40 p-4">
            <p className="text-xs text-white/40">Aktif Oda</p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <strong className="text-xl text-emerald-400">{roomCode}</strong>

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

      {status && <p className="mt-3 text-sm text-white/50">{status}</p>}
    </section>
  );
}