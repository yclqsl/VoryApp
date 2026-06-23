export default function ReactionBurst({ reactions = [] }) {
  if (!reactions.length) return null;

  return (
    <div className="vory-reaction-layer pointer-events-none">
      {reactions.map((reaction) => (
        <div
          key={reaction.visualId || reaction.id}
          className="vory-floating-reaction"
          style={{
            left: `${reaction.x || 50}%`,
            animationDelay: `${reaction.delay || 0}ms`,
          }}
        >
          <span>{reaction.emoji}</span>
          <small>{reaction.username}</small>
        </div>
      ))}
    </div>
  );
}
