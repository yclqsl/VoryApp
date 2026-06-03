const stars = Array.from({ length: 46 }, (_, index) => ({
  id: index,
  left: (index * 37) % 100,
  top: (index * 61) % 100,
  size: index % 5 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
  delay: (index % 9) * 0.35,
  duration: 5 + (index % 7),
}));

const particles = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: (index * 43) % 100,
  top: (index * 29) % 100,
  delay: (index % 8) * 0.45,
  duration: 6 + (index % 6),
}));

function themeEmoji(theme) {
  if (theme === "cinema") return "🎬";
  if (theme === "galaxy") return "✦";
  if (theme === "gaming") return "▣";
  return "✦";
}

export default function AnimatedBackground({ theme = "neon" }) {
  const cleanTheme = String(theme || "neon").toLowerCase();

  return (
    <div className={`vory-animated-bg vory-animated-bg-${cleanTheme}`} aria-hidden="true">
      <div className="vory-animated-orb vory-animated-orb-one" />
      <div className="vory-animated-orb vory-animated-orb-two" />
      <div className="vory-animated-orb vory-animated-orb-three" />

      {(cleanTheme === "galaxy" || cleanTheme === "neon") && (
        <div className="vory-animated-stars">
          {stars.map((star) => (
            <span
              key={star.id}
              className="vory-animated-star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {cleanTheme === "neon" && (
        <div className="vory-animated-particles">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="vory-animated-particle"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            >
              {themeEmoji(cleanTheme)}
            </span>
          ))}
        </div>
      )}

      {cleanTheme === "cinema" && (
        <>
          <div className="vory-cinema-scanlines" />
          <div className="vory-cinema-projector" />
        </>
      )}

      {cleanTheme === "gaming" && (
        <>
          <div className="vory-gaming-grid" />
          <div className="vory-gaming-scanline" />
        </>
      )}
    </div>
  );
}
