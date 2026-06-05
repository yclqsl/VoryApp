import { LogOut, MonitorUp, UserRound, UsersRound, Video } from "lucide-react";

const tabs = [
  { id: "watch", label: "Watch", icon: Video },
  { id: "friends", label: "Friends", icon: UsersRound },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "screen", label: "Screen", icon: MonitorUp },
  { id: "logout", label: "Logout", icon: LogOut },
];

export default function MobileBottomNav({
  activeTab,
  onChange,
  unreadMessages = 0,
  dmUnreadCount = 0,
  onlineCount = 0,
  roomCode,
  onLogout,
}) {
  const activeId = activeTab === "dm" || activeTab === "social" ? "friends" : activeTab === "room" ? "screen" : activeTab;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.75rem] border border-white/10 bg-black/85 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id !== "logout" && activeId === tab.id;

          const badge =
            tab.id === "friends" && (dmUnreadCount > 0 || onlineCount > 0)
              ? Math.min(dmUnreadCount || onlineCount, 99)
              : tab.id === "watch" && unreadMessages > 0
                ? Math.min(unreadMessages, 99)
                : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => tab.id === "logout" ? onLogout?.() : onChange?.(tab.id)}
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

              {tab.id === "screen" && roomCode ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
