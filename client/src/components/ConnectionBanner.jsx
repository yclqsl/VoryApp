import { RefreshCcw, RotateCw, Share2, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";

export default function ConnectionBanner({
  status,
  roomCode,
  message,
  onRestore,
  onForceSync,
}) {
  const isConnected = status === "connected";
  const isReconnecting = status === "reconnecting";

  async function copyRoomLink() {
    if (!roomCode) {
      toast.error("Önce oda oluştur veya odaya katıl.");
      return;
    }

    const roomLink = `${window.location.origin}/room/${roomCode}`;

    try {
      await navigator.clipboard.writeText(roomLink);
      toast.success("Room link copied 🚀");
    } catch (error) {
      toast.error("Link kopyalanamadı.");
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-black backdrop-blur-2xl ${
        isConnected
          ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-200"
          : isReconnecting
            ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
            : "border-red-400/20 bg-red-400/10 text-red-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {isConnected ? <Wifi size={17} /> : <WifiOff size={17} />}
        <span>
          {isConnected ? "Connected" : isReconnecting ? "Reconnecting..." : "Offline"}
        </span>

        {roomCode ? (
          <span className="rounded-full bg-black/20 px-2 py-1 text-[11px]">
            {roomCode}
          </span>
        ) : null}

        {message ? (
          <span className="hidden text-xs opacity-70 sm:inline">
            {message}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {!roomCode && (
          <button
            type="button"
            onClick={onRestore}
            className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/15"
          >
            <RefreshCcw size={13} />
            Restore
          </button>
        )}

        {roomCode && (
          <>
            <button
              type="button"
              onClick={copyRoomLink}
              className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/15"
              title="Room linkini kopyala"
            >
              <Share2 size={13} />
              Share
            </button>

            <button
              type="button"
              onClick={() => onForceSync?.("manual-click")}
              className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/15"
            >
              <RotateCw size={13} />
              Sync
            </button>
          </>
        )}
      </div>
    </div>
  );
}
