import { DoorOpen, LogOut } from "lucide-react";
import NotificationCenter from "./NotificationCenter";

export default function VoryTopBar({
  authUser,
  onLogout,
  isHost,
  roomCode,
  onLeaveRoom,
  connectionStatus,
  notifications,
  onMarkNotificationsRead,
  onClearNotifications,
  onNotificationClick,
}) {
  const showLobbyBrand = !roomCode;
  const title = "Vory Lobby";
  const subtitle = `@${authUser?.username || "user"} • Online`;

  return (
    <header
      className={`vory-v5-topbar vory-topbar-premium vory-rave-gap-topbar !rounded-[1.75rem] !border-white/10 !bg-black/25 !px-3.5 !py-2.5 !backdrop-blur-2xl ${
        roomCode ? "vory-v5-topbar-room vory-v5-topbar-actions-only vory-topbar-no-party-actions" : "vory-topbar-mobile-rave"
      }`}
    >
      {showLobbyBrand ? (
        <div className="vory-topbar-identity-premium flex min-w-0 items-center gap-3">
          <div className="vory-top-logo vory-top-logo-premium !h-11 !w-11">V</div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[15px] font-black tracking-[-0.04em] text-white">
                {title}
              </h1>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-bold text-white/45">
              <span className="vory-topbar-online-dot" />
              {subtitle}
            </p>
          </div>
        </div>
      ) : (
        <div className="vory-topbar-room-spacer min-w-0 flex-1" aria-hidden="true" />
      )}

      <div className="vory-topbar-action-stack flex min-w-0 items-center justify-end gap-2">
        {roomCode ? (
          <button
            type="button"
            onClick={onLeaveRoom}
            className="vory-leave-room-btn vory-topbar-leave-room inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-300/18 bg-red-500/16 px-4 text-xs font-black text-red-50 shadow-[0_14px_46px_rgba(220,38,38,0.16)] transition hover:bg-red-500/24"
            title="Odadan ayrıl"
            aria-label="Odadan ayrıl"
          >
            <DoorOpen size={16} />
            <span>Odadan ayrıl</span>
          </button>
        ) : null}

        <NotificationCenter
          notifications={notifications}
          onMarkRead={onMarkNotificationsRead}
          onClear={onClearNotifications}
          onNotificationClick={onNotificationClick}
        />

        {!roomCode ? (
          <button
            type="button"
            onClick={onLogout}
            className="vory-mobile-logout-btn inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-300/18 bg-red-500/12 px-3 text-xs font-black text-red-50 shadow-[0_14px_46px_rgba(220,38,38,0.12)] transition hover:bg-red-500/22 lg:hidden"
            title="Hesaptan çıkış"
            aria-label="Hesaptan çıkış"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
