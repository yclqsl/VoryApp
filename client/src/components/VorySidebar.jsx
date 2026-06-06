import { Home, LogOut, Menu, Settings, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";

const navItems = [
  { id: "watch", label: "Ana Sayfa", icon: Home },
  { id: "friends", label: "Arkadaşlar", icon: UsersRound },
  { id: "profile", label: "Profil", icon: UserRound },
];

const drawerItems = [
  { id: "watch", label: "Ana Sayfa", icon: Home },
  { id: "friends", label: "Arkadaşlar", icon: UsersRound },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

export default function VorySidebar({
  activeSection,
  onChange,
  roomCode,
  onlineCount = 0,
  userCount = 0,
  isAdmin = false,
  authUser = null,
  onLogout,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeId = activeSection === "admin" ? "settings" : activeSection;
  const avatar = authUser?.avatar;
  const username = authUser?.username || "vory";

  function go(section) {
    onChange?.(section);
    setDrawerOpen(false);
  }

  return (
    <>
      <aside className="vory-v5-sidebar !rounded-[2rem] !bg-black/25 !backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="vory-v5-logo"
          title="Menü"
        >
          <Menu size={26} />
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
                  : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`vory-v5-nav-button ${active ? "vory-v5-nav-active" : ""}`}
                title={item.label}
              >
                <Icon size={22} />
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

      {drawerOpen ? (
        <div className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <aside
            className="h-full w-[min(420px,82vw)] overflow-auto border-r border-white/10 bg-[#09090d]/92 px-7 py-8 shadow-[30px_0_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-10 flex flex-col items-center text-center">
              {avatar ? (
                <img src={avatar} alt="avatar" className="h-24 w-24 rounded-full border-4 border-white/80 object-cover shadow-2xl" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/70 bg-white/10 text-4xl font-black text-white">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="mt-4 max-w-full truncate text-2xl font-black text-white">@{username}</p>
            </div>

            <div className="space-y-8">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className="flex w-full flex-col items-center gap-3 rounded-[2rem] py-4 text-white transition hover:bg-white/8"
                  >
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/13 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                      <Icon size={48} />
                    </span>
                    <span className="text-3xl font-black">{item.label}</span>
                  </button>
                );
              })}

              {isAdmin ? (
                <button type="button" onClick={() => go("admin")} className="flex w-full flex-col items-center gap-3 rounded-[2rem] py-4 text-white transition hover:bg-white/8">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-fuchsia-500/20 text-4xl font-black">F</span>
                  <span className="text-3xl font-black">Feedback</span>
                </button>
              ) : null}

              <button type="button" onClick={onLogout} className="flex w-full flex-col items-center gap-3 rounded-[2rem] py-4 text-red-100 transition hover:bg-red-500/10">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15">
                  <LogOut size={48} />
                </span>
                <span className="text-3xl font-black">Çıkış</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
