import {
  Bell,
  CheckCheck,
  MessageCircle,
  Monitor,
  Radio,
  Trash2,
  Video,
  Users,
  Crown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function getNotificationIcon(type) {
  if (type === "screen") return Monitor;
  if (type === "voice") return Radio;
  if (type === "video") return Video;
  if (type === "room") return Users;
  if (type === "host") return Crown;
  if (type === "invite") return Users;
  return MessageCircle;
}

function timeAgo(timestamp) {
  if (!timestamp) return "şimdi";

  const diff = Date.now() - timestamp;
  const seconds = Math.max(1, Math.floor(diff / 1000));

  if (seconds < 60) return "şimdi";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function NotificationCenter({
  notifications = [],
  onMarkRead,
  onClear,
  onNotificationClick,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      const target = event.target;

      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);


  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      onMarkRead?.();
    }
  }

  function handleNotificationClick(notification) {
    if (!notification) return;

    onNotificationClick?.(notification);

    if (notification.type === "dm" || notification.type === "invite") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative z-[9999]">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.1]"
      >
        <Bell size={18} />
        Bildirimler

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-fuchsia-500 px-2 text-xs font-black text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]">
            {Math.min(99, unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-3 w-[390px] max-w-[90vw] overflow-hidden rounded-[2rem] border border-white/10 bg-black/90 shadow-[0_24px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h2 className="text-base font-black text-white">Bildirim Merkezi</h2>
              <p className="mt-1 text-xs text-white/40">
                Son {notifications.length} bildirim
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl bg-white/8 p-2 text-white/50 transition hover:bg-white/12 hover:text-white"
                onClick={onMarkRead}
                title="Okundu işaretle"
              >
                <CheckCheck size={16} />
              </button>

              <button
                type="button"
                className="rounded-xl bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                onClick={onClear}
                title="Temizle"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-auto p-3">
            {notifications.length === 0 ? (
              <div className="rounded-3xl bg-white/[0.04] p-5 text-center text-sm text-white/40">
                Henüz bildirim yok.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full rounded-3xl border p-3 text-left transition ${
                        notification.type === "dm" || notification.type === "invite"
                          ? "cursor-pointer hover:border-sky-300/25 hover:bg-sky-400/10"
                          : "cursor-default"
                      } ${
                        notification.read
                          ? "border-white/5 bg-white/[0.035]"
                          : "border-violet-400/20 bg-violet-400/10"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-violet-200">
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate text-sm font-black text-white">
                              {notification.title}
                            </h3>
                            <span className="shrink-0 text-[11px] font-bold text-white/30">
                              {timeAgo(notification.createdAt)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-white/55">
                            {notification.message}
                          </p>

                          {notification.displayRoomCode && notification.roomCode ? (
                            <p className="mt-2 text-[11px] font-black text-emerald-300/80">
                              ROOM {notification.roomCode}
                            </p>
                          ) : null}

                          {notification.type === "invite" ? (
                            <p className="mt-1 text-[11px] font-black text-fuchsia-200/75">
                              Katılmak için bildirime tıkla
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
