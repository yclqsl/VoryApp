import { SendHorizonal, UserPlus } from "lucide-react";
import { useEffect, useRef } from "react";

function formatChatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "now";

  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseMessage(raw = "") {
  if (raw && typeof raw === "object") {
    const isSystem = raw.type === "system" || String(raw.message || "").startsWith("⚙️");

    return {
      isSystem,
      sender: isSystem ? "Vory" : (raw.sender || raw.username || "Misafir"),
      body: isSystem
        ? String(raw.message || raw.body || "").replace("⚙️", "").trim()
        : String(raw.message || raw.body || ""),
      avatar: raw.avatar || "",
      userId: raw.userId || "",
      createdAt: raw.createdAt || Date.now(),
    };
  }

  const value = String(raw || "");
  const isSystem = value.startsWith("⚙️");
  const [sender, ...rest] = value.split(":");
  const body = rest.join(":").trim();

  return {
    isSystem,
    sender: isSystem ? "Vory" : (sender || "Misafir").trim(),
    body: isSystem ? value.replace("⚙️", "").trim() : (body || value),
    avatar: "",
    userId: "",
    createdAt: Date.now(),
  };
}

function ChatAvatar({ parsed }) {
  if (parsed.avatar) {
    return (
      <img
        src={parsed.avatar}
        alt="avatar"
        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/10 shadow-[0_12px_35px_rgba(255,255,255,0.10)]"
      />
    );
  }

  const initial = String(parsed.sender || "M").charAt(0).toUpperCase();

  return (
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black shadow-[0_12px_35px_rgba(255,255,255,0.12)]">
      {initial}
    </div>
  );
}

export default function ChatPanel({
  messages = [],
  message = "",
  setMessage,
  onSendMessage,
  onInviteClick,
  typingUser,
  onTyping,
  users = [],
  currentUser = null,
  voiceSlot = null,
}) {
  const messagesEndRef = useRef(null);

  function hydrateMessage(raw) {
    const parsed = parseMessage(raw);

    if (parsed.isSystem) return parsed;

    const senderKey = String(parsed.sender || "").trim().toLowerCase();
    const userIdKey = String(parsed.userId || "");
    const matchedUser = (users || []).find((user) => {
      const username = String(user?.username || "").trim().toLowerCase();
      const id = String(user?.userId || user?._id || user?.id || "");
      return (userIdKey && id === userIdKey) || (senderKey && username === senderKey);
    });

    return {
      ...parsed,
      avatar: parsed.avatar || matchedUser?.avatar || (senderKey === String(currentUser?.username || "").trim().toLowerCase() ? currentUser?.avatar || "" : ""),
    };
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="vory-chat-panel-fixed flex min-h-0 flex-1 flex-col rounded-[1.9rem] border border-white/8 bg-black/22 p-3 shadow-[0_22px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Party Chat</p>
          <h2 className="mt-1 text-lg font-black text-white">Messages</h2>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/45">
          {messages.length}
        </span>
      </div>

      <div className="vory-chat-scroll-lock custom-scroll min-h-0 flex-1 overflow-y-auto rounded-[1.45rem] bg-black/24 p-3">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[220px] items-center justify-center text-center">
            <div>
              <p className="font-black text-white/50">Sohbet boş</p>
              <p className="mt-1 text-xs font-bold text-white/28">Odaya ilk mesajı sen bırak knks.</p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const parsed = hydrateMessage(msg);

          if (parsed.isSystem) {
            return (
              <div key={msg?.id || index} className="mb-3 rounded-full bg-white/[0.045] px-3 py-2 text-center text-[11px] font-bold text-white/35">
                {parsed.body}
              </div>
            );
          }

          return (
            <div key={msg?.id || index} className="vory-chat-message-row mb-3 flex gap-2.5">
              <ChatAvatar parsed={parsed} />

              <div className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/[0.045] px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-black text-violet-100">{parsed.sender}</span>
                  <span className="shrink-0 text-[10px] font-bold text-white/28">{formatChatTime(parsed.createdAt)}</span>
                </div>
                <p className="break-words text-sm font-semibold leading-5 text-white/78">
                  {parsed.body}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {typingUser && (
        <div className="mt-2 px-2 text-xs font-bold text-white/38">
          ✍️ {typingUser} yazıyor...
        </div>
      )}

      <div className="vory-chat-input-row mt-2 flex items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
          placeholder="Mesaj yaz..."
          value={message}
          onChange={(e) => {
            setMessage?.(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => e.key === "Enter" && onSendMessage?.()}
        />


        {voiceSlot ? (
          <div className="vory-chat-voice-slot flex shrink-0 items-center justify-center">
            {voiceSlot}
          </div>
        ) : null}

        <button
          type="button"
          className="vory-chat-invite-btn flex w-auto items-center justify-center rounded-2xl border border-violet-300/18 bg-violet-500/18 px-4 py-3 text-violet-100 shadow-[0_14px_40px_rgba(139,92,246,0.12)] transition hover:scale-[1.02] hover:bg-violet-500/25"
          onClick={onInviteClick}
          title="Arkadaş davet et"
        >
          <UserPlus size={18} />
        </button>

        <button className="flex w-auto items-center justify-center rounded-2xl bg-white px-4 py-3 text-black shadow-[0_14px_40px_rgba(255,255,255,0.14)] transition hover:scale-[1.02]" onClick={onSendMessage}>
          <SendHorizonal size={18} />
        </button>
      </div>
    </section>
  );
}
