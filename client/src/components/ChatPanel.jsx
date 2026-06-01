import { useEffect, useRef } from "react";

export default function ChatPanel({
  messages,
  message,
  setMessage,
  onSendMessage,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="glass flex min-h-0 flex-1 flex-col">
      <h2 className="text-lg font-black">Canlı Sohbet</h2>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl bg-black/35 p-3">
        {messages.map((msg, index) => {
          const isSystem = msg.startsWith("⚙️");

          return (
            <div
              key={index}
              className={
                isSystem
                  ? "mb-3 text-center text-xs italic text-white/35"
                  : "mb-3 rounded-2xl bg-white/10 px-4 py-3 text-sm"
              }
            >
              {msg}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input mt-0"
          placeholder="Mesaj yaz..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
        />

        <button className="btn mt-0 w-auto px-5" onClick={onSendMessage}>
          Gönder
        </button>
      </div>
    </section>
  );
}