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
        <div className="vory-top-logo">
          V
        </div>

        <div className="vory-top-title">
          <div className="flex min-w-0 items-center gap-2">
            <h1>VoryApp</h1>

            {isHost && (
              <span className="vory-top-host-badge">
                HOST
              </span>
            )}
          </div>

          <span>
            {roomCode ? `Room ${roomCode}` : "Lobby"}
            {" • "}
            {userCount || 0} Online
            {" • "}
            @{authUser?.username || "user"}
          </span>
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
