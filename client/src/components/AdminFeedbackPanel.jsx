import { useEffect, useMemo, useState } from "react";
import {
  Bug,
  CheckCircle2,
  Clock3,
  Filter,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

const filters = [
  { id: "all", label: "Tümü" },
  { id: "bug", label: "Bug" },
  { id: "idea", label: "Öneri" },
  { id: "general", label: "Genel" },
  { id: "open", label: "Open" },
  { id: "reviewing", label: "Reviewing" },
  { id: "closed", label: "Closed" },
];

function getTypeIcon(type) {
  if (type === "idea") return Lightbulb;
  if (type === "general") return MessageSquare;
  return Bug;
}

function formatDate(value) {
  if (!value) return "Tarih yok";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Tarih yok";
  }
}

function statusClass(status) {
  if (status === "closed") return "bg-emerald-500/15 text-emerald-200 border-emerald-300/15";
  if (status === "reviewing") return "bg-amber-500/15 text-amber-200 border-amber-300/15";
  return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-300/15";
}

export default function AdminFeedbackPanel({ authUser }) {
  const [feedback, setFeedback] = useState([]);
  const [filter, setFilter] = useState("all");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdminName =
    authUser?.username === "admin" ||
    authUser?.email === "yucelinizbusiness@gmail.com";

  const filteredFeedback = useMemo(() => {
    if (filter === "all") return feedback;

    if (["open", "reviewing", "closed"].includes(filter)) {
      return feedback.filter((item) => (item.status || "open") === filter);
    }

    return feedback.filter((item) => item.type === filter);
  }, [feedback, filter]);

  const stats = useMemo(() => {
    const total = feedback.length;
    const open = feedback.filter((item) => (item.status || "open") === "open").length;
    const closed = feedback.filter((item) => item.status === "closed").length;
    const avgRating = total
      ? (
          feedback.reduce((sum, item) => sum + (Number(item.rating || item.metadata?.rating) || 0), 0) /
          total
        ).toFixed(1)
      : "0.0";

    return { total, open, closed, avgRating };
  }, [feedback]);

  function getAdminConfig() {
    const cleanKey = adminKey.trim();

    if (cleanKey) {
      return {
        params: { adminKey: cleanKey },
        headers: { "x-admin-key": cleanKey },
      };
    }

    return {};
  }

  async function loadFeedback(showToast = false) {
    try {
      setLoading(true);

      const { data } = await api.get("/feedback", getAdminConfig());
      setFeedback(data.feedback || []);

      if (showToast) {
        toast.success("Feedback listesi güncellendi.");
      }
    } catch (error) {
      setFeedback([]);

      if (showToast) {
        toast.error(error?.response?.data?.message || "Feedback okunamadı.", {
          id: "admin-feedback-load-error",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/feedback/${id}`, { status }, getAdminConfig());

      setFeedback((prev) =>
        prev.map((item) =>
          (item._id || item.id) === id
            ? { ...item, status }
            : item
        )
      );

      toast.success("Feedback durumu güncellendi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Durum güncellenemedi.");
    }
  }

  async function deleteFeedback(id) {
    const ok = window.confirm("Bu feedback silinsin mi?");
    if (!ok) return;

    try {
      await api.delete(`/feedback/${id}`, getAdminConfig());

      setFeedback((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success("Feedback silindi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Feedback silinemedi.");
    }
  }

  useEffect(() => {
    localStorage.removeItem("vory-admin-key");
    loadFeedback(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdminName) {
    return (
      <section className="glass-panel p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-500/15 p-3 text-red-200">
            <XCircle size={22} />
          </div>

          <div>
            <h2 className="text-xl font-black">Admin Panel</h2>
            <p className="mt-1 text-sm text-white/45">
              Bu alan sadece admin kullanıcı için aktif.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="glass-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              <ShieldCheck size={13} />
              V13.2 Admin Dashboard
            </div>

            <h1 className="text-2xl font-black text-white">Feedback Dashboard</h1>
            <p className="mt-1 text-sm text-white/45">
              Closed beta bug, öneri ve kullanıcı raporlarını buradan takip et.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_KEY varsa gir"
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40"
            />

            <button
              type="button"
              onClick={() => loadFeedback(true)}
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Yenile
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="glass-panel p-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">Toplam</p>
          <p className="mt-2 text-3xl font-black text-white">{stats.total}</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">Open</p>
          <p className="mt-2 text-3xl font-black text-fuchsia-200">{stats.open}</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">Closed</p>
          <p className="mt-2 text-3xl font-black text-emerald-200">{stats.closed}</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">Rating</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-amber-200">
            {stats.avgRating}
            <Star size={21} fill="currentColor" />
          </p>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-white/55">
          <Filter size={16} />
          Filtre
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
                filter === item.id
                  ? "border-violet-300/30 bg-violet-500/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredFeedback.length === 0 ? (
          <div className="glass-panel p-8 text-center text-white/45">
            Feedback bulunamadı.
          </div>
        ) : (
          filteredFeedback.map((item) => {
            const id = item._id || item.id;
            const Icon = getTypeIcon(item.type);
            const rating = Number(item.rating || item.metadata?.rating) || 0;

            return (
              <article key={id} className="glass-panel p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/12 px-3 py-1 text-xs font-black text-violet-100">
                        <Icon size={13} />
                        {item.type || "bug"}
                      </span>

                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status || "open")}`}>
                        {item.status || "open"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                        <Star size={12} fill="currentColor" />
                        {rating}/5
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/35">
                        <Clock3 size={12} />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <h2 className="text-lg font-black text-white">
                      {item.title || "Başlıksız feedback"}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">
                      {item.message}
                    </p>

                    <div className="mt-4 grid gap-2 rounded-2xl bg-black/20 p-3 text-xs text-white/35 md:grid-cols-3">
                      <div>
                        User: <span className="font-bold text-white/60">@{item.username || "anonim"}</span>
                      </div>
                      <div>
                        Room: <span className="font-bold text-white/60">{item.roomCode || "yok"}</span>
                      </div>
                      <div>
                        App: <span className="font-bold text-white/60">{item.appVersion || "beta"}</span>
                      </div>
                    </div>

                    {item.metadata?.url ? (
                      <p className="mt-2 break-all text-xs text-violet-200/45">
                        {item.metadata.url}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:flex-col">
                    <button
                      type="button"
                      onClick={() => updateStatus(id, "reviewing")}
                      className="rounded-2xl border border-amber-300/15 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/20"
                    >
                      Reviewing
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(id, "closed")}
                      className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 size={14} className="inline" /> Close
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(id, "open")}
                      className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-500/10 px-4 py-2 text-xs font-black text-fuchsia-200 transition hover:bg-fuchsia-500/20"
                    >
                      Reopen
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteFeedback(id)}
                      className="rounded-2xl border border-red-300/15 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={14} className="inline" /> Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
