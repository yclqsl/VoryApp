import { Clock3, Film, PlayCircle, Sparkles } from "lucide-react";

export default function WatchHistory({
  items = [],
  stats,
  onResumeWatch,
}) {
  const safeItems = Array.isArray(items) ? items.slice(0, 5) : [];
  const hasItems = safeItems.length > 0;

  const fallbackItems = [
    {
      id: "empty-1",
      title: "Henüz izleme geçmişi yok",
      meta: "Bir YouTube / MP4 linki başlatınca burada görünür.",
      progress: "Ready",
      url: "",
    },
  ];

  const visibleItems = hasItems ? safeItems : fallbackItems;
  const latestItem = hasItems ? safeItems[0] : null;

  return (
    <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.04] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200/55">
            Watch History
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            Recently Watched
          </h3>
        </div>

        <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-200">
          <Clock3 size={17} />
        </div>
      </div>

      <button
        type="button"
        disabled={!latestItem?.url}
        onClick={() => latestItem?.url && onResumeWatch?.(latestItem)}
        className="w-full rounded-3xl border border-fuchsia-400/10 bg-fuchsia-500/10 p-4 text-left transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-75"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/20 p-3 text-fuchsia-200">
            <PlayCircle size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">
              Continue Watching
            </p>
            <p className="mt-1 truncate text-xs font-bold text-white/45">
              {latestItem?.title || "Son izlenen medya burada görünür."}
            </p>
          </div>

          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/60">
            {latestItem?.url ? "RESUME" : "BETA"}
          </span>
        </div>
      </button>

      <div className="mt-3 space-y-2">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!item.url}
            onClick={() => item.url && onResumeWatch?.(item)}
            className="flex w-full items-center gap-3 rounded-3xl border border-white/6 bg-black/20 p-3 text-left transition hover:bg-white/[0.06] disabled:cursor-default"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-violet-200">
              <Film size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {item.title}
              </p>
              <p className="truncate text-xs font-bold text-white/35">
                {item.meta || "Vory watch session"}
              </p>
            </div>

            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black text-white/45">
              {item.progress || "Ready"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">{stats?.mediaPlayed || 0}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Media
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">{stats?.watchTime || "0h"}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Time
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">{stats?.syncScore || "0%"}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Sync
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-3xl bg-white/[0.04] p-3 text-xs font-bold text-white/35">
        <Sparkles size={14} />
        Watch history artık local olarak kayıt tutar. V13.1 ile MongoDB sync eklenebilir.
      </div>
    </div>
  );
}
