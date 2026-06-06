export default function AnimatedBackground({ theme = "voryapp" }) {
  return (
    <div className="vory-video-theme-bg" aria-hidden="true">
      <video
        className="vory-video-theme-media"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
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
