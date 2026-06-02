import {
  Home,
  MessageCircle,
  Radio,
  UsersRound,
  Video,
} from "lucide-react";

const items = [
  {
    id: "watch",
    label: "Watch",
    desc: "Video + screen",
    icon: Video,
  },
  {
    id: "room",
    label: "Room",
    desc: "Oda ayarları",
    icon: Home,
  },
  {
    id: "voice",
    label: "Voice",
    desc: "Sesli sohbet",
    icon: Radio,
  },
  {
    id: "chat",
    label: "Chat",
    desc: "Mesajlar",
    icon: MessageCircle,
  },
  {
    id: "friends",
    label: "Arkadaşlar",
    desc: "Presence",
    icon: UsersRound,
  },
];

export default function VorySidebar({
  activeSection,
  onChange,
  roomCode,
  onlineCount = 0,
  userCount = 0,
}) {
  return (
    <aside className="hidden w-[86px] shrink-0 lg:flex xl:w-[260px]">
      <div className="sticky top-5 flex h-[calc(100vh-2.5rem)] w-full flex-col rounded-[2rem] border border-white/10 bg-black/25 p-3 shadow-[0_20px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
        <div className="mb-4 flex items-center gap-3 rounded-3xl bg-white/[0.06] p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/25 text-xl font-black text-white shadow-[0_0_28px_rgba(139,92,246,0.25)]">
            V
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-black">VoryApp</p>
            <p className="truncate text-xs text-white/35">
              {roomCode ? `Room ${roomCode}` : "Lobby"}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;

            const badge =
              item.id === "friends" && onlineCount > 0
                ? onlineCount
                : item.id === "voice" && userCount > 0
                  ? userCount
                  : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange?.(item.id)}
                className={`group relative flex items-center gap-3 rounded-3xl p-3 text-left transition ${
                  active
                    ? "bg-violet-500/25 text-white shadow-[0_0_30px_rgba(139,92,246,0.18)]"
                    : "text-white/45 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                    active ? "bg-white/12 text-white" : "bg-white/[0.06]"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="hidden min-w-0 xl:block">
                  <p className="truncate text-sm font-black">{item.label}</p>
                  <p className="truncate text-xs text-white/35">{item.desc}</p>
                </div>

                {badge ? (
                  <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-black text-white">
                    {Math.min(99, badge)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 rounded-3xl border border-emerald-400/10 bg-emerald-400/10 p-3 text-center xl:text-left">
          <p className="text-xs font-black text-emerald-200">
            {roomCode ? "Oda aktif" : "Hazır"}
          </p>
          <p className="mt-1 hidden text-xs text-white/35 xl:block">
            Sol menü artık gerçek sayfa değiştirir.
          </p>
        </div>
      </div>
    </aside>
  );
}
