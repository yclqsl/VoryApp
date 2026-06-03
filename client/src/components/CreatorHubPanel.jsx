import { useState } from "react";
import { CalendarPlus, Crown, Flame, Radio, Star, Users } from "lucide-react";

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

function getDefaultEventTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function CreatorHubPanel({
  hub = null,
  currentUserId = "",
  currentRoomCode = "",
  loading = false,
  onRefresh,
  onFollowCreator,
  onJoinRoom,
  onCreateEvent,
  onRemindEvent,
}) {
  const featuredRooms = hub?.featuredRooms || [];
  const trendingCreators = hub?.trendingCreators || [];
  const liveEvents = hub?.liveEvents || [];
  const featuredCategories = hub?.featuredCategories || [];
  const liveNowEvents = liveEvents.filter((event) => event.liveNow);
  const upcomingEvents = liveEvents.filter((event) => event.status !== "past");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventIcon, setEventIcon] = useState("🎬");
  const [eventStartsAt, setEventStartsAt] = useState(getDefaultEventTime());
  const [eventRoomCode, setEventRoomCode] = useState(currentRoomCode || "");

  function submitEvent(event) {
    event.preventDefault();

    if (!eventTitle.trim()) return;

    onCreateEvent?.({
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      icon: eventIcon.trim() || "📅",
      startsAt: eventStartsAt ? new Date(eventStartsAt).toISOString() : null,
      roomCode: (eventRoomCode || currentRoomCode || "").trim().toUpperCase(),
    });

    setEventTitle("");
    setEventDescription("");
    setEventIcon("🎬");
    setEventStartsAt(getDefaultEventTime());
  }

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

      {liveNowEvents.length > 0 ? (
        <div className="mt-4 rounded-[1.75rem] border border-red-300/15 bg-gradient-to-br from-red-500/15 to-fuchsia-500/10 p-4 shadow-[0_20px_80px_rgba(239,68,68,0.10)]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-red-100/80">
            <Radio size={14} className="animate-pulse text-red-200" /> LIVE NOW
          </div>
          <div className="mt-3 space-y-2">
            {liveNowEvents.slice(0, 2).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{event.icon || "🔴"} {event.title}</p>
                  <p className="mt-1 truncate text-xs text-white/45">@{event.creatorUsername} • {event.whenLabel}</p>
                </div>
                {event.roomCode ? (
                  <button
                    type="button"
                    onClick={() => onJoinRoom?.(event.roomCode)}
                    className="rounded-2xl bg-red-400/20 px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-400/30"
                  >
                    Odaya Git
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
          <p className="text-base font-black text-sky-100">{compactNumber(upcomingEvents.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Events</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-3">
          <p className="text-base font-black text-emerald-100">{compactNumber(featuredCategories.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Categories</p>
        </div>
      </div>

      <form onSubmit={submitEvent} className="mt-5 rounded-[1.75rem] border border-sky-300/10 bg-sky-400/5 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-sky-100/70">
          <CalendarPlus size={14} /> Schedule Event
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
            placeholder="Event title: Marvel Marathon"
            className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-sky-300/30"
          />
          <input
            value={eventIcon}
            onChange={(event) => setEventIcon(event.target.value)}
            placeholder="Icon"
            maxLength={4}
            className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-sky-300/30"
          />
          <input
            type="datetime-local"
            value={eventStartsAt}
            onChange={(event) => setEventStartsAt(event.target.value)}
            className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/30"
          />
          <input
            value={eventRoomCode}
            onChange={(event) => setEventRoomCode(event.target.value.toUpperCase())}
            placeholder={currentRoomCode ? `Room ${currentRoomCode}` : "Room code optional"}
            className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-sky-300/30"
          />
        </div>
        <textarea
          value={eventDescription}
          onChange={(event) => setEventDescription(event.target.value)}
          placeholder="Kısa açıklama..."
          className="mt-2 min-h-[76px] w-full rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-sky-300/30"
        />
        <button
          type="submit"
          disabled={!eventTitle.trim() || loading}
          className="mt-3 rounded-2xl bg-sky-400/18 px-4 py-3 text-xs font-black text-sky-100 transition hover:bg-sky-400/28 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Event Oluştur
        </button>
      </form>

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
            <CalendarPlus size={14} className="text-sky-200" /> Upcoming Events
          </div>
          <div className="mt-3 space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-white/35">Yaklaşan event yok.</p>
            ) : (
              upcomingEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-2xl bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black">
                        {event.liveNow ? "🔴 " : ""}{event.icon || "📅"} {event.title}
                      </p>
                      <p className="mt-1 text-xs text-white/40">@{event.creatorUsername} • {event.whenLabel || "yakında"}</p>
                      <p className="mt-1 text-[11px] font-bold text-white/30">🔔 {compactNumber(event.reminderCount)} reminder</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemindEvent?.(event)}
                      className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black transition ${event.remindedByMe ? "bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25" : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"}`}
                    >
                      {event.remindedByMe ? "Reminded" : "Remind Me"}
                    </button>
                  </div>
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
