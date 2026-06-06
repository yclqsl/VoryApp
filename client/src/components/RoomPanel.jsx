import { DoorOpen, Link } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function RoomPanel({ roomInput, setRoomInput, roomCode, onJoinRoom }) {
  async function copyInviteLink() {
    if (!roomCode) return;
    try {
      const { data } = await api.post("/invites/room-link", { roomCode });
      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Davet linki kopyalandı 🔗");
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
      toast.success("Davet linki kopyalandı 🔗");
    }
  }

  if (roomCode) return null;

  return (
    <section className="rounded-[2.25rem] border border-white/10 bg-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-violet-200/55">Vory Party</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Watch together</h2>
          <p className="mt-1 max-w-xl text-sm font-bold text-white/40">
            Rave akışı: sağ alttaki + ile oda oluştur, kodla katıl, arkadaşlarını davet et.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto] lg:min-w-[500px]">
          <input
            className="h-14 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-black uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
            placeholder="Oda kodu"
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
          />

          <button
            type="button"
            onClick={onJoinRoom}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-6 text-sm font-black text-white/75 transition hover:bg-white/12 hover:text-white"
          >
            <DoorOpen size={17} /> Join
          </button>
        </div>
      </div>
    </section>
  );
}
