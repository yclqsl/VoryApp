import { CalendarPlus, Crown, Flame, Radio, Star, Users, Video } from "lucide-react";

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
}

function creatorBadgeIcon(badge = "") {
  const clean = String(badge || "").toLowerCase();
  if (clean.includes("verified")) return "✅";
  if (clean.includes("top")) return "🔥";
  if (clean.includes("movie")) return "🎬";
  if (clean.includes("community")) return "⭐";
  return "👑";
}

export default function CreatorHubPanel({
  hub = null,
  currentUserId = "",
  loading = false,
  onRefresh,
  onFollowCreator,
  onJoinRoom,
}) {
  const featuredRooms = hub?.featuredRooms || [];
  const trendingCreators = hub?.trendingCreators || [];
  const liveEvents = hub?.liveEvents || [];
  const featuredCategories = hub?.featuredCategories || [];

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Crown size={19} className="text-yellow-200" />
            <h2 className="text-lg font-black">Creator Hub</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Trending creatorlar, featured odalar ve yaklaşan live eventler.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/60 transition hover:bg-white/12 hover:text-white"
        >
          {loading ? "Yükleniyor..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3">
          <p className="text-base font-black text-yellow-100">{compactNumber(trendingCreators.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Creators</p>
        </div>
        <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/5 p-3">
          <p className="text-base font-black text-fuchsia-100">{compactNumber(featuredRooms.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Rooms</p>
        </div>
        <div className="rounded-2xl border border-sky-300/10 bg-sky-400/5 p-3">
          <p className="text-base font-black text-sky-100">{compactNumber(liveEvents.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Events</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-3">
          <p className="text-base font-black text-emerald-100">{compactNumber(featuredCategories.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Categories</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/40">
          <Flame size={14} className="text-orange-200" /> Featured Rooms
        </div>
        <div className="mt-3 space-y-2">
          {featuredRooms.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-sm text-white/40">
              Henüz featured public oda yok. Public room açınca burada görünür.
            </div>
          ) : (
            featuredRooms.slice(0, 4).map((room) => (
              <div key={room.roomCode} className="rounded-3xl border border-white/5 bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">🎬 {room.mediaTitle || "Live Room"}</p>
                    <p className="mt-1 truncate text-xs text-white/40">
                      @{room.hostUsername || "creator"} • {room.roomCode} • {compactNumber(room.userCount)} kişi
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJoinRoom?.(room.roomCode)}
                    className="rounded-2xl bg-violet-500/18 px-3 py-2 text-xs font-black text-violet-100 transition hover:bg-violet-500/28"
                  >
                    Katıl
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/40">
          <Users size={14} className="text-violet-200" /> Trending Creators
        </div>
        <div className="mt-3 space-y-2">
          {trendingCreators.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-sm text-white/40">
              Creator listesi için kullanıcı aktivitesi bekleniyor.
            </div>
          ) : (
            trendingCreators.slice(0, 6).map((creator) => {
              const following = !!creator.isFollowedByMe;
              const isMe = String(creator._id || creator.id || "") === String(currentUserId || "");

              return (
                <div key={creator._id || creator.username} className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-white/[0.04] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/30 to-fuchsia-500/20 text-lg">
                      {creator.avatar ? <img src={creator.avatar} alt="avatar" className="h-full w-full rounded-2xl object-cover" /> : "👑"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black">@{creator.username}</p>
                      <p className="truncate text-xs text-white/38">
                        {compactNumber(creator.followersCount)} takipçi • Level {creator.profileLevel || 1}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(creator.creatorBadges || []).slice(0, 2).map((badge) => (
                          <span key={badge} className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-black text-yellow-100">
                            {creatorBadgeIcon(badge)} {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!isMe ? (
                    <button
                      type="button"
                      onClick={() => onFollowCreator?.(creator)}
                      className={`rounded-2xl px-3 py-2 text-xs font-black transition ${following ? "bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25" : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"}`}
                    >
                      {following ? "Following" : "+ Follow"}
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40">
            <CalendarPlus size={14} className="text-sky-200" /> Live Events
          </div>
          <div className="mt-3 space-y-2">
            {liveEvents.length === 0 ? (
              <p className="text-sm text-white/35">Yaklaşan event yok.</p>
            ) : (
              liveEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-sm font-black">{event.icon || "📅"} {event.title}</p>
                  <p className="mt-1 text-xs text-white/40">@{event.creatorUsername} • {event.whenLabel || "yakında"}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40">
            <Star size={14} className="text-yellow-200" /> Popular Categories
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(featuredCategories.length ? featuredCategories : ["Movies", "Gaming", "Anime", "Music"]).slice(0, 8).map((category) => (
              <span key={category} className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/60">
                #{category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
