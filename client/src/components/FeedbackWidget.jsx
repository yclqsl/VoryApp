import { Bug, Lightbulb, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

const feedbackTypes = [
  {
    id: "bug",
    label: "Bug",
    icon: Bug,
  },
  {
    id: "idea",
    label: "Öneri",
    icon: Lightbulb,
  },
  {
    id: "general",
    label: "Genel",
    icon: MessageSquare,
  },
];

export default function FeedbackWidget({ authUser, roomCode, connectionStatus }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("bug");
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
        roomCode,
        username: authUser?.username || "Anonim",
        userId: authUser?.id || authUser?._id || "",
        userAgent: navigator.userAgent,
        appVersion: "closed-beta",
        metadata: {
          url: window.location.href,
          connectionStatus,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          createdAtClient: Date.now(),
        },
      });

      toast.success("Feedback gönderildi, eyvallah 🙏");
      setTitle("");
      setMessage("");
      setType("bug");
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
        className="fixed bottom-24 left-4 z-[55] flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm font-black text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition hover:bg-white/10 lg:bottom-5"
      >
        <Bug size={17} className="text-fuchsia-300" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitFeedback}
            className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0a16] p-5 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Feedback gönder</h2>
                <p className="mt-1 text-sm text-white/45">
                  Beta’da gördüğün bug/öneriyi direkt bize gönder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white/8 p-2 text-white/45 transition hover:bg-white/12 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2">
              {feedbackTypes.map((item) => {
                const Icon = item.icon;
                const active = type === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black transition ${
                      active
                        ? "bg-violet-500/25 text-white"
                        : "text-white/40 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <label className="mb-3 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                Başlık
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Örn: Screen share izleyicide açılmadı"
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
                className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40"
                maxLength={3000}
              />
            </label>

            <div className="mt-4 rounded-3xl bg-white/[0.04] p-3 text-xs text-white/35">
              Room: <span className="font-bold text-white/60">{roomCode || "yok"}</span> •
              Connection: <span className="font-bold text-white/60">{connectionStatus || "unknown"}</span>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-3xl bg-white px-5 py-4 font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {sending ? "Gönderiliyor..." : "Gönder"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
