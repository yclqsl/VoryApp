import { ArrowRight, MessageCircle, MonitorUp, Play, Radio, ShieldCheck, Sparkles, UsersRound, Video } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

const features = [
  {
    icon: Video,
    title: "Perfect Sync",
    text: "Arkadaşlarınla aynı anda izle. Play, pause ve seek herkes için senkron kalır.",
  },
  {
    icon: Radio,
    title: "Voice Rooms",
    text: "Oda içinde canlı sesli sohbet. Film gecesi, maç yayını veya YouTube partisi için hazır.",
  },
  {
    icon: MonitorUp,
    title: "Screen Share",
    text: "PC'den ekran paylaş, odadakiler anında izlesin. Watch party deneyimini büyüt.",
  },
  {
    icon: UsersRound,
    title: "Friends & Invites",
    text: "Arkadaşlarını davet et, public odaları keşfet ve tek tıkla partiye katıl.",
  },
];

const stats = [
  { value: "1-click", label: "Instant rooms" },
  { value: "Live", label: "Voice & chat" },
  { value: "Sync", label: "Watch together" },
];

export default function LandingPage({ onEnterApp, onLogin, onRegister }) {
  return (
    <main className="vory-premium-shell">
      <AnimatedBackground theme="galaxy" />

      <nav className="vory-landing-nav">
        <button type="button" className="vory-brand-lockup" onClick={onEnterApp}>
          <span className="vory-brand-mark">V</span>
          <span>
            <strong>VoryApp</strong>
            <em>Closed beta watch party</em>
          </span>
        </button>

        <div className="vory-landing-nav-actions">
          <button type="button" className="vory-link-btn" onClick={onLogin}>Sign in</button>
          <button type="button" className="vory-glow-btn vory-glow-btn-sm" onClick={onRegister}>Get started</button>
        </div>
      </nav>

      <section className="vory-hero-grid">
        <div className="vory-hero-copy">
          <div className="vory-premium-kicker">
            <Sparkles size={16} /> Vory 1.0 Premium Experience
          </div>

          <h1>
            Watch together.
            <span> Feel together.</span>
          </h1>

          <p className="vory-hero-lead">
            Rave tarzı sade watch party deneyimi; senkron video, canlı chat, voice ve screen share tek premium ekranda.
          </p>

          <div className="vory-hero-actions">
            <button type="button" className="vory-glow-btn" onClick={onEnterApp}>
              Start watching <ArrowRight size={18} />
            </button>
            <button type="button" className="vory-ghost-btn" onClick={onLogin}>
              <Play size={17} /> Sign in
            </button>
          </div>

          <div className="vory-stat-strip">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="vory-live-preview-card">
          <div className="vory-live-preview-top">
            <span className="vory-live-dot">LIVE</span>
            <span>Room VX-108</span>
          </div>

          <div className="vory-preview-player">
            <div className="vory-preview-play"><Play size={28} fill="currentColor" /></div>
            <div className="vory-preview-gradient" />
          </div>

          <div className="vory-preview-info">
            <div>
              <h3>Marvel Marathon</h3>
              <p>@yucel • Cinema night</p>
            </div>
            <span className="vory-preview-pill">42 watching</span>
          </div>

          <div className="vory-preview-controls">
            <span><MessageCircle size={14} /> Chat active</span>
            <span><Radio size={14} /> 11 voice</span>
            <span><ShieldCheck size={14} /> Synced</span>
          </div>
        </div>
      </section>

      <section className="vory-feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="vory-feature-card">
              <div className="vory-feature-icon"><Icon size={20} /></div>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
