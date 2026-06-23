import { MessageCircle, Radio, Settings2, UsersRound } from "lucide-react";

const tabs = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "voice", label: "Voice", icon: Radio },
  { id: "room", label: "Room", icon: Settings2 },
  { id: "social", label: "Social", icon: UsersRound },
];

export default function VoryPanelTabs({
  activeTab,
  onChange,
  messageCount = 0,
  onlineCount = 0,
  userCount = 0,
}) {
  function getBadge(tabId) {
    if (tabId === "chat") return messageCount;
    if (tabId === "social") return onlineCount;
    if (tabId === "voice") return userCount;
    return 0;
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-2">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badge = getBadge(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-black transition ${
                active
                  ? "bg-violet-500/25 text-white shadow-[0_0_28px_rgba(139,92,246,0.18)]"
                  : "text-white/40 hover:bg-white/8 hover:text-white/75"
              }`}
            >
              <span className="relative">
                <Icon size={18} />
                {badge > 0 ? (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] text-white">
                    {Math.min(99, badge)}
                  </span>
                ) : null}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
