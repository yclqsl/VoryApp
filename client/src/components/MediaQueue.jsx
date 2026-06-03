import { ListVideo, Play, Plus, ThumbsUp, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

function detectLabel(type) {
  if (type === "youtube") return "YouTube";
  if (type === "direct-video") return "MP4 / Direct";
  if (type === "url") return "URL";
  return "Media";
}

export default function MediaQueue({
  roomCode,
  isHost,
  currentMedia,
  queue = [],
  onAdd,
  onPlayNext,
  onRemove,
  onClear,
  onVote,
  currentUserId,
  defaultOpen = true,
}) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(defaultOpen);

  const canUse = !!roomCode;

  const nextTitle = useMemo(() => {
    if (!queue.length) return "Sıra boş";
    return queue[0]?.title || queue[0]?.url || "Sıradaki medya";
  }, [queue]);

  function submitMedia(event) {
    event.preventDefault();

    const cleanUrl = mediaUrl.trim();

    if (!canUse) {
      toast.error("Önce odaya gir.");
      return;
    }

    if (!cleanUrl) {
      toast.error("Medya linki gir.");
      return;
    }

    onAdd?.(cleanUrl, title.trim() || cleanUrl);
    setMediaUrl("");
    setTitle("");
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
            <ListVideo size={18} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">
              Media Queue
            </h2>
            <p className="truncate text-xs text-white/40">
              {currentMedia ? `Şu an: ${currentMedia.title}` : nextTitle}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
              Auto Next aktif 🎬
            </p>
          </div>
        </div>

        <button
          type="button"
          className="rounded-xl bg-white/8 px-3 py-2 text-xs font-black text-white/55 transition hover:bg-white/12 hover:text-white"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Kapat" : "Aç"}
        </button>
      </div>

      {open && (
        <>
          <form className="vory-v8-media-form mt-4" onSubmit={submitMedia}>
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="Paste YouTube / MP4 link"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40"
            />

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Başlık opsiyonel"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40"
            />

            <button
              type="submit"
              disabled={!canUse}
              className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500/20 px-4 py-3 text-sm font-black text-violet-100 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
              Ekle
            </button>
          </form>

          {currentMedia && (
            <div className="mt-4 rounded-3xl border border-emerald-400/15 bg-emerald-400/10 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-200/65">
                Şu an oynuyor
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {currentMedia.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/40">
                    {detectLabel(currentMedia.type)} • {currentMedia.addedBy}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                  LIVE
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-white/35">
              Sıradakiler ({queue.length})
            </p>

            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPlayNext}
                  disabled={!queue.length}
                  className="flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  <Play size={13} />
                  Next
                </button>

                <button
                  type="button"
                  onClick={onClear}
                  disabled={!queue.length}
                  className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Temizle
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {queue.length === 0 ? (
              <div className="rounded-3xl bg-white/[0.04] p-4 text-sm text-white/35">
                Sırada medya yok. YouTube veya MP4 linki ekleyebilirsin.
              </div>
            ) : (
              queue.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-white/[0.04] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-xs font-black text-white/55">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/35">
                        {detectLabel(item.type)} • {item.addedBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onVote?.(item.id)}
                      disabled={!canUse || !onVote}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        Array.isArray(item.voters) && item.voters.includes(String(currentUserId || ""))
                          ? "bg-violet-500/30 text-violet-100"
                          : "bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                      }`}
                      title="Bu medyaya oy ver"
                    >
                      <ThumbsUp size={13} />
                      {item.votes || 0}
                    </button>

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => onRemove?.(item.id)}
                        className="rounded-xl bg-white/8 p-2 text-white/35 transition hover:bg-red-500/15 hover:text-red-300"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
