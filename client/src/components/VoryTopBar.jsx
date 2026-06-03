import { Crown, MonitorUp, Radio, UsersRound } from "lucide-react";
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
  hostTransferMessage = "",
  onRestore,
  onForceSync,
  notifications,
  onMarkNotificationsRead,
  onClearNotifications,
  onNotificationClick,
}) {
  return (
    <header className="vory-v5-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <div className="vory-top-logo">
          V
        </div>

        <div className="vory-top-title">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1>VoryApp</h1>

            {isHost && (
              <span className="vory-top-host-badge">
                HOST
              </span>
            )}

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(244,114,182,0.22)",
                background: "rgba(217,70,239,0.15)",
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "rgb(251,207,232)",
                whiteSpace: "nowrap",
              }}
            >
              🧪 CLOSED BETA
            </span>
          </div>

          <span>
            {roomCode ? `Room ${roomCode}` : "Lobby"}
            {" • "}
            👥 {userCount || 0} Online
            {" • "}
            @{authUser?.username || "user"}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-2 xl:flex">
        <div
          className="vory-live-pill"
          style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
        >
          <UsersRound size={15} />
          <span style={{ fontWeight: 900, lineHeight: 1 }}>
            {watchingCount || 0} Watching
          </span>
        </div>

        <div
          className="vory-live-pill"
          style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
        >
          <Radio size={15} />
          <span style={{ fontWeight: 900, lineHeight: 1 }}>
            {voiceCount || 0} Voice
          </span>
        </div>

        <div
          className={`vory-live-pill ${screenCount > 0 ? "vory-live-pill-on" : ""}`}
          style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
        >
          <MonitorUp size={15} />
          <span style={{ fontWeight: 900, lineHeight: 1 }}>
            {screenCount || 0} Screen
          </span>
        </div>
      </div>

      {hostTransferMessage ? (
        <div className="hidden items-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.12)] lg:flex">
          <Crown size={14} />
          <span className="max-w-[220px] truncate">
            {hostTransferMessage}
          </span>
        </div>
      ) : null}

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
          onNotificationClick={onNotificationClick}
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
