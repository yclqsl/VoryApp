import { Bug, Lightbulb, MessageSquare, Send, Star, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

const feedbackTypes = [
  {
    id: "bug",
    label: "Bug",
    helper: "Bozulan / çalışmayan şey",
    icon: Bug,
  },
  {
    id: "idea",
    label: "Öneri",
    helper: "Yeni özellik fikri",
    icon: Lightbulb,
  },
  {
    id: "general",
    label: "Genel",
    helper: "Deneyim / yorum",
    icon: MessageSquare,
  },
];

export default function FeedbackWidget({ authUser, roomCode, connectionStatus }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("bug");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submitFeedback(event) {
    event.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Başlık ve açıklama gir kanka.");
      return;
    }

    try {
      setSending(true);

      await api.post("/feedback", {
        type,
        title: title.trim(),
        message: message.trim(),
        rating,
        roomCode,
        username: authUser?.username || "Anonim",
        userId: authUser?.id || authUser?._id || "",
        userAgent: navigator.userAgent,
        appVersion: "v13.7.3.1-mobile-feedback-fit-polish",
        metadata: {
          rating,
          url: window.location.href,
          connectionStatus,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          createdAtClient: Date.now(),
        },
      });

      toast.success("Beta feedback gönderildi, eyvallah 🙏");
      setTitle("");
      setMessage("");
      setType("bug");
      setRating(5);
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Feedback gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="vory-feedback-fab"
      >
        <Bug size={17} className="text-fuchsia-300" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-stretch justify-center bg-black/90 p-0 backdrop-blur-xl sm:items-center sm:p-4">
          <form
            onSubmit={submitFeedback}
            className="relative z-[100000] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-[#0c0a16] text-white shadow-[0_-20px_90px_rgba(0,0,0,0.65)] sm:h-auto sm:max-h-[88vh] sm:max-w-[560px] sm:rounded-[1.75rem] sm:border sm:border-white/10 sm:shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
          >
            <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4">
              

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200 sm:text-[11px]">
                    🧪 Closed Beta
                  </div>

                  <h2 className="text-lg font-black sm:text-xl">Feedback Center</h2>
                  <p className="mt-1 text-xs font-bold text-white/45 sm:text-sm">
                    Bug, öneri veya deneyimini gönder.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-2xl bg-white/8 p-2 text-white/45 transition hover:bg-white/12 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:p-5">
              <div className="grid grid-cols-3 gap-2">
                {feedbackTypes.map((item) => {
                  const Icon = item.icon;
                  const active = type === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`rounded-2xl border p-2.5 text-left transition sm:p-3 ${
                        active
                          ? "border-violet-400/35 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black sm:mb-2 sm:gap-2 sm:text-sm">
                        <Icon size={15} />
                        {item.label}
                      </div>
                      <p className="hidden text-xs font-bold opacity-60 sm:block">{item.helper}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-white/35">
                      Deneyim puanı
                    </p>
                    <p className="mt-1 hidden text-xs text-white/35 sm:block">
                      Beta hissi nasıl?
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white">
                    {rating}/5
                  </span>
                </div>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                        value <= rating
                          ? "border-amber-300/25 bg-amber-400/15 text-amber-200"
                          : "border-white/10 bg-black/20 text-white/25 hover:text-white/60"
                      }`}
                    >
                      <Star size={17} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                  Başlık
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Örn: Invite link tıklayınca oda açılmadı"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40"
                  maxLength={140}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                  Açıklama
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ne yaptın, ne oldu, ne bekliyordun?"
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40 sm:min-h-[150px]"
                  maxLength={3000}
                />
              </label>

              <div className="grid gap-2 rounded-2xl bg-white/[0.04] p-2.5 text-[11px] text-white/35 sm:grid-cols-3">
                <div>
                  Room: <span className="font-bold text-white/60">{roomCode || "yok"}</span>
                </div>
                <div>
                  Connection: <span className="font-bold text-white/60">{connectionStatus || "unknown"}</span>
                </div>
                <div>
                  User: <span className="font-bold text-white/60">@{authUser?.username || "anonim"}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#0c0a16]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-5">
              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={17} />
                {sending ? "Gönderiliyor..." : "Feedback Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
