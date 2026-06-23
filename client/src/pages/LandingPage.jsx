export default function LandingPage({ onEnterApp, onLogin, onRegister }) {
  return (
    <main className="vory-landing-refresh text-white">
      <div className="vory-landing-shell">
        <nav className="vory-landing-nav">
          <div className="vory-landing-brand">
            <div className="vory-landing-logo">V</div>
            <div>
              <strong>VoryApp</strong>
              <span>Closed beta watch party</span>
            </div>
          </div>

          <div className="vory-landing-actions">
            <button type="button" onClick={onLogin} className="vory-landing-btn vory-landing-btn-ghost">
              Sign in
            </button>
            <button type="button" onClick={onRegister || onEnterApp} className="vory-landing-btn vory-landing-btn-primary">
              Get started
            </button>
          </div>
        </nav>

        <section className="vory-landing-hero">
          <div>
            <div className="vory-landing-kicker">✦ Vory premium beta</div>
            <h1 className="vory-landing-title">
              Watch together. <span>Feel closer.</span>
            </h1>
            <p className="vory-landing-copy">
              Rave tadında sade watch party deneyimi: senkron video, canlı chat, voice, davet ve arkadaş akışı tek premium odada.
            </p>

            <div className="vory-landing-cta">
              <button type="button" onClick={onEnterApp || onRegister} className="vory-landing-btn vory-landing-btn-primary">
                Start watching →
              </button>
              <button type="button" onClick={onLogin} className="vory-landing-btn vory-landing-btn-ghost">
                ▶ Sign in
              </button>
            </div>

            <div className="vory-landing-stats">
              <div className="vory-landing-stat"><strong>1-click</strong><span>Oda kur, platform seç, başlat.</span></div>
              <div className="vory-landing-stat"><strong>Live</strong><span>Chat + voice aynı akışta.</span></div>
              <div className="vory-landing-stat"><strong>Sync</strong><span>Herkes aynı saniyede.</span></div>
            </div>
          </div>

          <div className="vory-landing-preview" aria-hidden="true">
            <div className="flex items-center justify-between px-1 pb-4">
              <span className="rounded-full bg-pink-500/18 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-pink-100">Live</span>
              <span className="text-xs font-black text-white/42">Room VX-108</span>
            </div>
            <div className="vory-landing-preview-screen">
              <div className="vory-landing-play"><b>▶</b></div>
            </div>
            <div className="vory-landing-preview-info">
              <div className="min-w-0">
                <h3>Friday Party</h3>
                <p>@vory • cinema night</p>
              </div>
              <span className="vory-landing-pill">42 watching</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
