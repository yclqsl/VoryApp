import { Link, Copy, Send } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function InviteBox({ roomCode }) {
  async function createInviteLink() {
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
      toast.success("Davet linki kopyalandı 🚀");
    } catch (error) {
      toast.error(error.response?.data?.message || "Davet linki oluşturulamadı.");
    }
  }

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Davet</h2>
          <p className="mt-1 text-xs text-white/35">Arkadaşlarını odaya çağır.</p>
        </div>

        <Link size={18} className="text-violet-300" />
      </div>

      <div className="mt-4 rounded-3xl bg-black/25 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">
          Paylaşılacak Oda
        </p>
        <p className="mt-1 text-lg font-black text-white">{roomCode || "Aktif oda yok"}</p>
      </div>

      <button
        className="btn-secondary flex items-center justify-center gap-2"
        onClick={createInviteLink}
      >
        <Copy size={17} />
        Linki Kopyala
      </button>

      <button
        className="btn-secondary flex items-center justify-center gap-2"
        onClick={createInviteLink}
      >
        <Send size={17} />
        Hızlı Davet
      </button>
    </section>
  );
}
