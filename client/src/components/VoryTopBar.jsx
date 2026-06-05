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
  onNotificationClick,
}) {
  return (
    <header className="vory-v5-topbar !rounded-[1.75rem] !border-white/10 !bg-black/25 !px-3.5 !py-2.5 !backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="vory-top-logo !h-9 !w-9">V</div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-black text-white">
              {roomCode ? `Room ${roomCode}` : "Vory Lobby"}
            </h1>
            {isHost ? <span className="vory-top-host-badge">HOST</span> : null}
          </div>
          <p className="mt-0.5 truncate text-xs font-bold text-white/38">
            @{authUser?.username || "user"} • {userCount || 0} online
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-2 xl:flex">
        <div className="rounded-2xl bg-white/8 px-2.5 py-2 text-xs font-black text-white/55">
          <span className="inline-flex items-center gap-2"><UsersRound size={14} />{watchingCount || 0}</span>
        </div>
        <div className="rounded-2xl bg-white/8 px-2.5 py-2 text-xs font-black text-white/55">
          <span className="inline-flex items-center gap-2"><Radio size={14} />{voiceCount || 0}</span>
        </div>
        <div className={`rounded-2xl px-2.5 py-2 text-xs font-black ${screenCount > 0 ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/55"}`}>
          <span className="inline-flex items-center gap-2"><MonitorUp size={14} />{screenCount || 0}</span>
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
