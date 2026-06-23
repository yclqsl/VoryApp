export default function AnimatedBackground({ theme = "voryapp", performanceMode = false, lobbyMode = false }) {
  if (performanceMode || lobbyMode) {
    return (
      <div className={`vory-video-theme-bg vory-video-theme-bg-lite ${lobbyMode ? "vory-video-theme-bg-hardcut" : ""}`} aria-hidden="true">
        <div className="vory-video-theme-lite-glow vory-video-theme-lite-glow-a" />
        <div className="vory-video-theme-lite-glow vory-video-theme-lite-glow-b" />
        <div className="vory-video-theme-tint" />
      </div>
    );
  }

  return (
    <div className="vory-video-theme-bg" aria-hidden="true">
      <video
        className="vory-video-theme-media"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/assets/voryapp.webm" type="video/webm" />
        <source src="/assets/voryapp.mp4" type="video/mp4" />
      </video>

      <div className="vory-video-theme-tint" />
      <div className="vory-video-theme-vignette" />
      <div className="vory-video-theme-noise" />
    </div>
  );
}
