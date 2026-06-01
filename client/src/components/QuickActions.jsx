import { Copy, Radio, Zap } from "lucide-react";
import toast from "react-hot-toast";

export default function QuickActions({ roomCode, isHost }) {
  async function copyRoom() {
    if (!roomCode) {
      toast.error("Aktif oda yok.");
      return;
    }

    await navigator.clipboard.writeText(roomCode);
    toast.success("Oda kodu kopyalandı.");
  }

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Hızlı İşlemler</h2>
        <Zap size={18} className="text-fuchsia-300" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          className="rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
          onClick={copyRoom}
        >
          <Copy size={18} className="mb-2 text-violet-300" />
          <p className="text-sm font-bold">Oda Kodunu Kopyala</p>
          <p className="mt-1 text-xs text-white/35">{roomCode || "Oda yok"}</p>
        </button>

        <div className="rounded-2xl bg-white/10 p-4 text-left">
          <Radio size={18} className="mb-2 text-emerald-300" />
          <p className="text-sm font-bold">Durum</p>
          <p className="mt-1 text-xs text-white/35">
            {isHost ? "Host kontrolünde" : "İzleyici modu"}
          </p>
        </div>
      </div>
    </section>
  );
}
