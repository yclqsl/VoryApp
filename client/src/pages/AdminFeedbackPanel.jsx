import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function AdminFeedbackPanel() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadFeedback() {
    try {
      setLoading(true);

      const { data } = await api.get("/feedback", {
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      });

      setItems(data.feedback || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adminKey) return;
    loadFeedback();
  }, []);

  return (
    <main className="min-h-screen bg-[#080711] p-5 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">Feedback Admin</h1>
            <p className="mt-1 text-white/45">Closed beta bug/öneri listesi.</p>
          </div>

          <div className="flex gap-2">
            <input
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_KEY"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            />

            <button
              onClick={loadFeedback}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black"
            >
              <RefreshCcw size={16} />
              {loading ? "..." : "Yükle"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-violet-200/60">
                    {item.type} • {item.status}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{item.title}</h2>
                </div>

                <p className="text-xs text-white/35">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/60">
                {item.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/35">
                <span className="rounded-full bg-white/8 px-3 py-1">User: {item.username}</span>
                <span className="rounded-full bg-white/8 px-3 py-1">Room: {item.roomCode || "yok"}</span>
                <span className="rounded-full bg-white/8 px-3 py-1">Version: {item.appVersion}</span>
              </div>
            </article>
          ))}

          {items.length === 0 && (
            <div className="rounded-3xl bg-white/[0.04] p-8 text-center text-white/40">
              Feedback yok veya admin key girilmedi.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
