import { DoorOpen, Link, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function RoomPanel({ roomInput, setRoomInput, roomCode, onCreateRoom, onJoinRoom }) {
  async function copyInviteLink() {
    if (!roomCode) return;
    try {
      const token = localStorage.getItem("vory_token");
      const { data } = await api.post("/invites/room-link", { roomCode }, { headers: { Authorization: `Bearer ${token}` } });
      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Davet linki kopyalandı 🔗");
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
      toast.success("Davet linki kopyalandı 🔗");
    }
  }

  if (roomCode) return null;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200/55">Rave Party</p>
      <h2 className="mt-1 text-2xl font-black text-white">Oda oluştur veya katıl</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25" placeholder="Oda kodu" value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())} />
        <button className="h-12 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white" onClick={onCreateRoom}><PlusCircle size={16} className="mr-2 inline" />Oda Oluştur</button>
        <button className="h-12 rounded-2xl border border-white/10 bg-white/8 px-5 text-sm font-black text-white/75" onClick={onJoinRoom}><DoorOpen size={16} className="mr-2 inline" />Katıl</button>
      </div>
    </section>
  );
}
