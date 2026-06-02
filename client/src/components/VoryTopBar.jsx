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
    <header className="vory-topbar">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/25 text-sm font-black shadow-[0_0_26px_rgba(139,92,246,0.22)]">
            V
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">
              VoryApp
            </p>
            <p className="truncate text-xs text-white/35">
              {authUser?.username || "Beta user"} • {isHost ? "Host" : "Guest"} • 👥 {userCount || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 justify-end gap-2">
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
          className="hidden rounded-2xl border border-red-400/10 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 md:block"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
