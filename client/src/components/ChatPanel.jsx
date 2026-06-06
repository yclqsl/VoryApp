import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChatPanel({
  messages = [],
  message = "",
  setMessage,
  onSendMessage,
  typingUser,
  onTyping,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[1.7rem] border border-white/8 bg-black/18 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-black">Chat</h2>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/35">
          {messages.length}
        </span>
      </div>

      <div className="custom-scroll min-h-[360px] flex-1 overflow-y-auto rounded-[1.35rem] bg-black/20 p-3">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[220px] items-center justify-center text-center">
            <div>
              <p className="font-black text-white/45">Sohbet boş</p>
              <p className="mt-1 text-xs font-bold text-white/25">İlk mesajı sen gönder.</p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isSystem = String(msg || "").startsWith("⚙️");
          const [sender, ...rest] = String(msg || "").split(":");
          const body = rest.join(":").trim();

          if (isSystem) {
            return (
              <div key={index} className="mb-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-center text-[11px] font-bold text-white/30">
                {String(msg).replace("⚙️", "").trim()}
              </div>
            );
          }

          return (
            <div key={index} className="mb-3 px-1 text-sm leading-5">
              <span className="mr-2 font-black text-violet-200">{sender || "Misafir"}</span>
              <span className="break-words text-white/78">{body || msg}</span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {typingUser && (
        <div className="mt-2 px-2 text-xs font-bold text-white/35">
          ✍️ {typingUser} yazıyor...
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
          placeholder="Mesaj yaz..."
          value={message}
          onChange={(e) => {
            setMessage?.(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => e.key === "Enter" && onSendMessage?.()}
        />

        <button className="flex w-auto items-center justify-center rounded-2xl bg-white px-4 py-3 text-black transition hover:scale-[1.02]" onClick={onSendMessage}>
          <SendHorizonal size={18} />
        </button>
      </div>
    </section>
  );
}
