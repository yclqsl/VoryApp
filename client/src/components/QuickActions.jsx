import { Copy, Radio, Zap, Users, Crown } from "lucide-react";
import toast from "react-hot-toast";

export default function QuickActions({ roomCode, isHost, userCount = 0 }) {
  async function copyRoom() {
    if (!roomCode) {
      toast.error("Aktif oda yok.");
      return;
    }

    await navigator.clipboard.writeText(roomCode);
    toast.success("Oda kodu kopyalandı.");
  }

  const items = [
    {
      icon: Copy,
      label: "Oda Kodu",
      value: roomCode || "Oda yok",
      onClick: copyRoom,
      color: "text-violet-300",
    },
    {
      icon: Radio,
      label: "Durum",
      value: isHost ? "Host kontrolünde" : "İzleyici modu",
      color: "text-emerald-300",
    },
    {
      icon: Users,
      label: "Katılımcı",
      value: `${userCount} kişi`,
      color: "text-sky-300",
    },
    {
      icon: Crown,
      label: "Yetki",
      value: isHost ? "Host" : "Viewer",
      color: "text-yellow-300",
    },
  ];

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Oda Özeti</h2>
          <p className="text-xs text-white/35">Hızlı kontrol merkezi</p>
        </div>
        <Zap size={18} className="text-fuchsia-300" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="card-hover rounded-3xl border border-white/8 bg-white/7 p-4 text-left"
              onClick={item.onClick}
              type="button"
            >
              <Icon size={19} className={`mb-3 ${item.color}`} />
              <p className="text-sm font-black">{item.label}</p>
              <p className="mt-1 truncate text-xs text-white/38">{item.value}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
