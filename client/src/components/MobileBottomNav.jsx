import { Home, Radio, UserRound, UsersRound } from "lucide-react";

const tabs = [
  { id: "watch", label: "Watch", icon: Home },
  { id: "people", label: "People", icon: UsersRound },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "room", label: "Room", icon: Radio },
];

export default function MobileBottomNav({
  activeTab,
  onChange,
  unreadMessages = 0,
  dmUnreadCount = 0,
  onlineCount = 0,
  roomCode,
}) {
  const activeId = activeTab === "dm" || activeTab === "social" || activeTab === "friends" ? "people" : activeTab === "settings" ? "room" : activeTab;

  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 rounded-[2rem] border border-white/10 bg-black/82 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeId === tab.id;

          const badge =
            tab.id === "people" && (dmUnreadCount > 0 || onlineCount > 0)
              ? Math.min(dmUnreadCount || onlineCount, 99)
              : tab.id === "watch" && unreadMessages > 0
                ? Math.min(unreadMessages, 99)
                : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[1.4rem] px-2 py-2.5 text-[10px] font-black transition ${
                active
                  ? "bg-white text-black shadow-[0_16px_45px_rgba(255,255,255,0.18)]"
                  : "text-white/45 hover:bg-white/8 hover:text-white/85"
              }`}
            >
              <span className="relative">
                <Icon size={20} />
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
