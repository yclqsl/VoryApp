import { MonitorUp, Radio, UsersRound } from "lucide-react";
import ConnectionBanner from "./ConnectionBanner";
import NotificationCenter from "./NotificationCenter";

export default function VoryTopBar({
  authUser,
  onLogout,
  isHost,
  roomCode,
  userCount,
  watchingCount = 0,
  voiceCount = 0,
  screenCount = 0,
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

      <div className="hidden items-center gap-2 xl:flex">
        <div className="vory-live-pill">
          <UsersRound size={15} />
          <strong>{watchingCount || 0}</strong>
          <span>Watching</span>
        </div>

        <div className="vory-live-pill">
          <Radio size={15} />
          <strong>{voiceCount || 0}</strong>
          <span>Voice</span>
        </div>

        <div className={`vory-live-pill ${screenCount > 0 ? "vory-live-pill-on" : ""}`}>
          <MonitorUp size={15} />
          <strong>{screenCount || 0}</strong>
          <span>Screen</span>
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
