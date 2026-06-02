import ConnectionBanner from "./ConnectionBanner";
import NotificationCenter from "./NotificationCenter";

export default function VoryTopBar({
  authUser,
  onLogout,
  isHost,
  roomCode,
  userCount,
  connectionStatus,
  lastRestoreMessage,
  onRestore,
  onForceSync,
  notifications,
  onMarkNotificationsRead,
  onClearNotifications,
}) {
  return (
    <header className="vory-v5-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/25 font-black shadow-[0_0_24px_rgba(139,92,246,0.25)] sm:flex">
          V
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-black text-white">VoryApp</h1>

            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-black text-white/45">
              {roomCode ? `ROOM ${roomCode}` : "LOBBY"}
            </span>

            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-black text-white/45">
              👥 {userCount || 0}
            </span>

            {isHost && (
              <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-200">
                HOST
              </span>
            )}
          </div>

          <p className="truncate text-xs text-white/35">
            @{authUser?.username || "user"} • Watch together
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <ConnectionBanner
          status={connectionStatus}
          roomCode={roomCode}
          message={lastRestoreMessage}
          onRestore={onRestore}
          onForceSync={onForceSync}
        />

        <NotificationCenter
          notifications={notifications}
          onMarkRead={onMarkNotificationsRead}
          onClear={onClearNotifications}
        />

        <button
          type="button"
          onClick={onLogout}
          className="vory-v5-logout"
          title="Çıkış"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
