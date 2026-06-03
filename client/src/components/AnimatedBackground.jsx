const stars = Array.from({ length: 52 }, (_, index) => ({
  id: index,
  left: (index * 37) % 100,
  top: (index * 61) % 100,
  size: index % 5 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
  delay: (index % 9) * 0.25,
  duration: 4 + (index % 5),
}));

const particles = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: (index * 43) % 100,
  top: (index * 29) % 100,
  delay: (index % 8) * 0.35,
  duration: 4 + (index % 5),
}));

const shootingStars = Array.from({ length: 7 }, (_, index) => ({
  id: index,
  top: 8 + index * 12,
  delay: index * 1.15,
}));

export default function AnimatedBackground({ theme = "neon" }) {
  const cleanTheme = String(theme || "neon").toLowerCase();

  return (
    <div className={`vory-animated-bg vory-animated-bg-${cleanTheme}`} aria-hidden="true">
      <div className="vory-animated-orb vory-animated-orb-one" />
      <div className="vory-animated-orb vory-animated-orb-two" />
      <div className="vory-animated-orb vory-animated-orb-three" />

      {(cleanTheme === "galaxy" || cleanTheme === "neon") && (
        <>
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

          <div className="vory-shooting-stars">
            {shootingStars.map((star) => (
              <span
                key={star.id}
                className="vory-shooting-star"
                style={{
                  top: `${star.top}%`,
                  animationDelay: `${star.delay}s`,
                }}
              />
            ))}
          </div>
        </>
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
              ✦
            </span>
          ))}
        </div>
      )}

      {cleanTheme === "cinema" && (
        <>
          <div className="vory-cinema-scanlines" />
          <div className="vory-cinema-projector" />
          <div className="vory-cinema-flicker-card" />
        </>
      )}

      {cleanTheme === "gaming" && (
        <>
          <div className="vory-gaming-grid" />
          <div className="vory-gaming-scanline" />
          <div className="vory-gaming-pulse" />
        </>
      )}
    </div>
  );
}
