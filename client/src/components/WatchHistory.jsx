import { Clock3, Film, PlayCircle, Sparkles } from "lucide-react";

const historyItems = [
  {
    id: "watch-1",
    title: "Vory Beta Night",
    meta: "Closed beta test room",
    progress: "Ready",
  },
  {
    id: "watch-2",
    title: "Movie Party",
    meta: "Last synced session",
    progress: "0%",
  },
  {
    id: "watch-3",
    title: "YouTube Watch",
    meta: "Queue test",
    progress: "0%",
  },
];

export default function WatchHistory() {
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

      <div className="rounded-3xl border border-fuchsia-400/10 bg-fuchsia-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/20 p-3 text-fuchsia-200">
            <PlayCircle size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">
              Continue Watching
            </p>
            <p className="mt-1 truncate text-xs font-bold text-white/45">
              Start your next synced watch party.
            </p>
          </div>

          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/60">
            BETA
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {historyItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-3xl border border-white/6 bg-black/20 p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-violet-200">
              <Film size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {item.title}
              </p>
              <p className="truncate text-xs font-bold text-white/35">
                {item.meta}
              </p>
            </div>

            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black text-white/45">
              {item.progress}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">0</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Media
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">0h</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Time
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3 text-center">
          <p className="text-lg font-black text-white">0%</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Sync
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-3xl bg-white/[0.04] p-3 text-xs font-bold text-white/35">
        <Sparkles size={14} />
        Watch history backend sync will be added in V12.8.1.
      </div>
    </div>
  );
}
