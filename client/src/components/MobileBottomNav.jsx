import { Home, MessageCircle, Radio, UserRound, Video } from "lucide-react";

const tabs = [
  {
    id: "watch",
    label: "Watch",
    icon: Video,
  },
  {
    id: "dm",
    label: "DM",
    icon: MessageCircle,
  },
  {
    id: "voice",
    label: "Voice",
    icon: Radio,
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
  },
  {
    id: "room",
    label: "Room",
    icon: Home,
  },
  {
    id: "social",
    label: "Social",
    icon: UserRound,
  },
];

export default function MobileBottomNav({
  activeTab,
  onChange,
  unreadMessages = 0,
  dmUnreadCount = 0,
  onlineCount = 0,
  roomCode,
}) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.75rem] border border-white/10 bg-black/85 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          const badge =
            tab.id === "dm" && dmUnreadCount > 0
              ? Math.min(dmUnreadCount, 99)
              : tab.id === "chat" && unreadMessages > 0
                ? Math.min(unreadMessages, 99)
                : tab.id === "social" && onlineCount > 0
                ? Math.min(onlineCount, 99)
                : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition ${
                active
                  ? "bg-violet-500/25 text-white shadow-[0_0_24px_rgba(139,92,246,0.22)]"
                  : "text-white/40 hover:bg-white/8 hover:text-white/75"
              }`}
            >
              <span className="relative">
                <Icon size={19} />
                {badge ? (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] leading-none text-white">
                    {badge}
                  </span>
                ) : null}
              </span>

              <span>{tab.label}</span>

              {tab.id === "room" && roomCode ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
