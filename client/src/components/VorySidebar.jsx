import { Home, MessageCircle, Radio, UsersRound, Video } from "lucide-react";

const items = [
  { id: "watch", label: "Watch", icon: Video },
  { id: "room", label: "Room", icon: Home },
  { id: "voice", label: "Voice", icon: Radio },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "friends", label: "Social", icon: UsersRound },
];

export default function VorySidebar({
  activeSection,
  onChange,
  roomCode,
  onlineCount = 0,
  userCount = 0,
}) {
  return (
    <aside className="vory-v5-sidebar">
      <button
        type="button"
        onClick={() => onChange?.("watch")}
        className="vory-v5-logo"
        title={roomCode ? `Room ${roomCode}` : "VoryApp"}
      >
        V
      </button>

      <nav className="flex flex-1 flex-col items-center gap-2">
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
              className={`vory-v5-nav-button ${active ? "vory-v5-nav-active" : ""}`}
              title={item.label}
            >
              <Icon size={21} />
              {badge ? <span className="vory-v5-nav-badge">{Math.min(99, badge)}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className={`vory-v5-status-dot ${roomCode ? "bg-emerald-300" : "bg-white/25"}`} />
    </aside>
  );
}
