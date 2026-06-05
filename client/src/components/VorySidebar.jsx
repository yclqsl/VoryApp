import { Compass, Settings, UserRound, UsersRound, Video } from "lucide-react";

const navItems = [
  { id: "watch", label: "Watch", icon: Video },
  { id: "friends", label: "Friends", icon: UsersRound },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function VorySidebar({
  activeSection,
  onChange,
  roomCode,
  onlineCount = 0,
  userCount = 0,
  isAdmin = false,
}) {
  const activeId = activeSection === "admin" ? "settings" : activeSection;

  return (
    <aside className="vory-v5-sidebar !rounded-[2rem] !bg-black/25 !backdrop-blur-2xl">
      <button
        type="button"
        onClick={() => onChange?.("watch")}
        className="vory-v5-logo"
        title={roomCode ? `Room ${roomCode}` : "VoryApp"}
      >
        V
      </button>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeId === item.id;
          const badge =
            item.id === "friends" && onlineCount > 0
              ? onlineCount
              : item.id === "watch" && userCount > 0
                ? userCount
                : item.id === "settings" && isAdmin
                  ? "A"
                  : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
              className={`vory-v5-nav-button ${active ? "vory-v5-nav-active" : ""}`}
              title={item.label}
            >
              <Icon size={21} />
              {badge ? <span className="vory-v5-nav-badge">{typeof badge === "number" ? Math.min(99, badge) : badge}</span> : null}
            </button>
          );
        })}
      </nav>

      <div
        className={`vory-v5-status-dot ${roomCode ? "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.75)]" : onlineCount > 0 ? "bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,0.55)]" : "bg-white/25"}`}
        title={roomCode ? `Live in ${roomCode}` : onlineCount > 0 ? `${onlineCount} online` : "Offline"}
      />
    </aside>
  );
}
