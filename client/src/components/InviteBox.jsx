import { Link, Copy } from "lucide-react";
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
            Authorization: `Bearer ${token}`
          }
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
        <h2 className="text-lg font-black">Davet</h2>
        <Link size={18} className="text-violet-300" />
      </div>

      <p className="mt-2 text-sm text-white/45">
        Oda linkini arkadaşlarınla paylaş.
      </p>

      <button
        className="btn-secondary flex items-center justify-center gap-2"
        onClick={createInviteLink}
      >
        <Copy size={17} />
        Davet Linkini Kopyala
      </button>
    </section>
  );
}
