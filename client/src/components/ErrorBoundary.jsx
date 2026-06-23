import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("VoryApp crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#080711] p-6 text-white">
          <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/15 text-2xl">
              ⚠️
            </div>

            <h1 className="text-2xl font-black">Bir şey ters gitti</h1>
            <p className="mt-2 text-sm text-white/50">
              VoryApp bu ekranda çöktü. Sayfayı yenileyerek tekrar deneyebilirsin.
            </p>

            <button
              className="mt-5 rounded-2xl bg-violet-500/25 px-5 py-3 font-black text-violet-100 transition hover:bg-violet-500/35"
              onClick={() => window.location.reload()}
            >
              Yeniden Yükle
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
