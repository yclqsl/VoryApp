import { MessageCircle, MonitorUp, Radio, Settings2, SmilePlus } from "lucide-react";
import { useState } from "react";

const reactionEmojis = ["🔥", "😂", "❤️", "👍", "😮"];

export default function VoryBottomDock({
  roomCode,
  isHost,
  onOpenRoom,
  onOpenVoice,
  onOpenChat,
  onReaction,
  screenShare,
}) {
  const [showShare, setShowShare] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="vory-v5-bottom-dock">
      <button type="button" onClick={onOpenVoice} className="vory-v5-dock-btn">
        <Radio size={17} />
        Voice
      </button>

      <button type="button" onClick={onOpenChat} className="vory-v5-dock-btn">
        <MessageCircle size={17} />
        Chat
      </button>

      <button
        type="button"
        onClick={() => setShowReactions((value) => !value)}
        className="vory-v5-dock-btn"
      >
        <SmilePlus size={17} />
        React
      </button>

      <button type="button" onClick={() => setShowShare((value) => !value)} className="vory-v5-dock-btn">
        <MonitorUp size={17} />
        Share
      </button>

      <button type="button" onClick={onOpenRoom} className="vory-v5-dock-btn">
        <Settings2 size={17} />
        Room
      </button>

      <div className="ml-auto hidden rounded-full bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200 sm:block">
        {roomCode ? `ROOM ${roomCode}` : "LOBBY"} • {isHost ? "HOST" : "GUEST"}
      </div>

      {showReactions && (
        <div className="vory-reaction-picker">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReaction?.(emoji);
                setShowReactions(false);
              }}
              className="vory-reaction-btn"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {showShare && (
        <div className="absolute bottom-full left-0 mb-3 w-[min(720px,90vw)]">
          {screenShare}
        </div>
      )}
    </div>
  );
}
