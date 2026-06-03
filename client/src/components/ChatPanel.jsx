import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChatPanel({
  messages,
  message,
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
    <section className="glass flex min-h-[420px] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Live Chat</h2>
          <p className="text-xs text-white/35">Oda içi mesajlar ve aktiviteler</p>
        </div>

        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/40">
          {messages.length} mesaj
        </span>
      </div>

      <div className="custom-scroll mt-4 flex-1 overflow-y-auto rounded-3xl border border-white/5 bg-black/25 p-4">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[180px] items-center justify-center text-center">
            <div>
              <p className="font-bold text-white/55">Sohbet henüz boş</p>
              <p className="mt-1 text-sm text-white/30">İlk mesajı sen gönder.</p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isSystem = msg.startsWith("⚙️");
          const [sender, ...rest] = msg.split(":");
          const body = rest.join(":").trim();

          if (isSystem) {
            return (
              <div
                key={index}
                className="mb-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-center text-xs italic text-white/38"
              >
                {msg.replace("⚙️", "").trim()}
              </div>
            );
          }

          return (
            <div key={index} className="mb-3 rounded-3xl border border-violet-400/10 bg-violet-500/12 px-4 py-3 text-sm shadow-lg">
              <div className="mb-1 text-xs font-black text-violet-200">
                {sender || "Misafir"}
              </div>
              <div className="text-white/85">{body || msg}</div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {typingUser && (
        <div className="mt-3 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/45">
          ✍️ {typingUser} yazıyor...
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="input mt-0"
          placeholder="Mesaj yaz..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
        />

        <button className="btn mt-0 w-auto px-5" onClick={onSendMessage}>
          <SendHorizonal size={18} />
        </button>
      </div>
    </section>
  );
}
