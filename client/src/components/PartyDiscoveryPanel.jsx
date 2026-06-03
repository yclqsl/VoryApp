import { Lock, Radio, RefreshCw, Sparkles, Unlock, Users, Video } from "lucide-react";

function getThemeEmoji(theme = "neon") {
  const cleanTheme = String(theme || "neon").toLowerCase();

  if (cleanTheme === "cinema") return "🎬";
  if (cleanTheme === "galaxy") return "🌌";
  if (cleanTheme === "gaming") return "🎮";

  return "💜";
}

function getRoomScore(room) {
  return Number(room?.userCount || 0) * 4 + Number(room?.voiceCount || 0) * 2 + Number(room?.videoActive || 0);
}

export default function PartyDiscoveryPanel({
  rooms = [],
  loading = false,
  currentRoomCode = "",
  isHost = false,
  currentRoomPublic = false,
  onRefresh,
  onJoinRoom,
  onTogglePublic,
}) {
  const trendingRooms = [...(rooms || [])].sort((a, b) => getRoomScore(b) - getRoomScore(a)).slice(0, 3);

  return (
    <section className="glass-panel overflow-hidden border-violet-300/15 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-violet-500/15 p-2 text-violet-200">
              <Sparkles size={17} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-200/55">
                V14 Party Discovery
              </p>
              <h2 className="mt-1 text-xl font-black text-white">Aktif public odalar</h2>
            </div>
          </div>
          <p className="mt-2 text-sm font-bold text-white/45">
            Public odalar burada görünür; tek tıkla katıl, popüler odaları keşfet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentRoomCode && (
            <button
              type="button"
              onClick={() => onTogglePublic?.(!currentRoomPublic)}
              disabled={!isHost}
              className={`rounded-2xl border px-4 py-2 text-xs font-black transition ${
                currentRoomPublic
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.04] text-white/55"
              } ${!isHost ? "cursor-not-allowed opacity-50" : "hover:bg-white/10"}`}
              title={isHost ? "Odayı public/private yap" : "Sadece host değiştirebilir"}
            >
              <span className="inline-flex items-center gap-2">
                {currentRoomPublic ? <Unlock size={14} /> : <Lock size={14} />}
                {currentRoomPublic ? "Public Room" : "Private Room"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white/60 transition hover:bg-white/10"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Yenile
            </span>
          </button>
        </div>
      </div>

      {trendingRooms.length > 0 && (
        <div className="mt-5 rounded-[1.5rem] border border-amber-300/10 bg-amber-400/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200/55">Trending Rooms</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {trendingRooms.map((room, index) => (
              <button
                key={`trend-${room.roomCode}`}
                type="button"
                onClick={() => onJoinRoom?.(room.roomCode)}
                className="rounded-2xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-violet-300/25 hover:bg-white/[0.06]"
              >
                <p className="text-xs font-black text-amber-200">#{index + 1}</p>
                <p className="mt-1 truncate font-black text-white">{room.roomCode}</p>
                <p className="mt-1 text-xs font-bold text-white/40">👥 {room.userCount || 0} kişi</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {rooms.length === 0 ? (
          <div className="rounded-[1.5rem] border border-white/5 bg-black/20 p-5 text-sm font-bold text-white/40">
            Şu an public oda yok. Bir oda oluşturup Public Room yapınca burada görünecek.
          </div>
        ) : (
          rooms.map((room) => {
            const sameRoom = String(room.roomCode) === String(currentRoomCode);

            return (
              <article
                key={room.roomCode}
                className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200/50">
                      {getThemeEmoji(room.theme)} {room.theme || "neon"} theme
                    </p>
                    <h3 className="mt-1 truncate text-lg font-black text-white">ROOM {room.roomCode}</h3>
                    <p className="mt-1 truncate text-sm font-bold text-white/45">
                      Host: {room.hostUsername || "Host"}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                    Public
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
                    <Users size={16} className="mx-auto text-violet-200" />
                    <p className="mt-1 text-sm font-black text-white">{room.userCount || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Kişi</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
                    <Radio size={16} className="mx-auto text-emerald-200" />
                    <p className="mt-1 text-sm font-black text-white">{room.voiceCount || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Voice</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
                    <Video size={16} className="mx-auto text-sky-200" />
                    <p className="mt-1 text-sm font-black text-white">{room.videoActive ? "Live" : "Idle"}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Watch</p>
                  </div>
                </div>

                <p className="mt-3 truncate rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/45">
                  🎬 {room.mediaTitle || "Lobby"}
                </p>

                <button
                  type="button"
                  onClick={() => onJoinRoom?.(room.roomCode)}
                  disabled={sameRoom || room.locked || room.inviteOnly}
                  className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black transition ${
                    sameRoom
                      ? "bg-white/10 text-white/35"
                      : room.locked || room.inviteOnly
                        ? "bg-red-500/10 text-red-200/55"
                        : "bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                  }`}
                >
                  {sameRoom ? "Şu an bu odadasın" : room.locked || room.inviteOnly ? "Kilitli / Invite Only" : "Tek Tıkla Katıl"}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
