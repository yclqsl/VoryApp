import {
  Home,
  MessageCircle,
  Radio,
  UsersRound,
  Video,
} from "lucide-react";

const items = [
  { id: "watch", label: "Watch", desc: "Video", icon: Video },
  { id: "room", label: "Room", desc: "Oda", icon: Home },
  { id: "voice", label: "Voice", desc: "Ses", icon: Radio },
  { id: "chat", label: "Chat", desc: "Mesaj", icon: MessageCircle },
  { id: "friends", label: "Social", desc: "Arkadaş", icon: UsersRound },
];

export default function VorySidebar({
  activeSection,
  onChange,
  roomCode,
  onlineCount = 0,
  userCount = 0,
}) {
  return (
    <aside className="relative z-40 hidden w-[82px] shrink-0 pointer-events-auto lg:flex xl:w-[230px]">
      <div className="sticky top-4 flex h-[calc(100vh-2rem)] w-full flex-col rounded-[1.75rem] border border-white/10 bg-black/30 p-2.5 shadow-[0_20px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => onChange?.("watch")}
          className="mb-3 flex items-center gap-3 rounded-[1.35rem] bg-white/[0.055] p-2.5 text-left transition hover:bg-white/[0.085]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/25 text-lg font-black text-white shadow-[0_0_24px_rgba(139,92,246,0.22)]">
            V
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-black text-white">VoryApp</p>
            <p className="truncate text-[11px] text-white/35">
              {roomCode ? `Room ${roomCode}` : "Lobby"}
            </p>
          </div>
        </button>

        <nav className="flex flex-1 flex-col gap-1.5">
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
                className={`relative flex w-full items-center gap-3 rounded-[1.35rem] p-2.5 text-left transition active:scale-[0.98] ${
                  active
                    ? "bg-white text-black shadow-[0_12px_32px_rgba(255,255,255,0.08)]"
                    : "text-white/48 hover:bg-white/[0.075] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
                    active ? "bg-black/8 text-black" : "bg-white/[0.06]"
                  }`}
                >
                  <Icon size={19} />
                </div>

                <div className="hidden min-w-0 xl:block">
                  <p className="truncate text-sm font-black">{item.label}</p>
                  <p className={`truncate text-[11px] ${active ? "text-black/45" : "text-white/30"}`}>
                    {item.desc}
                  </p>
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

        <div className="mt-3 rounded-[1.35rem] border border-emerald-400/10 bg-emerald-400/10 p-3 text-center xl:text-left">
          <p className="text-xs font-black text-emerald-200">
            {roomCode ? "Live Room" : "Ready"}
          </p>
          <p className="mt-1 hidden text-[11px] text-white/35 xl:block">
            Beta build aktif.
          </p>
        </div>
      </div>
    </aside>
  );
}
