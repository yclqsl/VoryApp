import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("vory-pwa-dismissed") === "true";
  });

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();

      if (dismissed) return;

      setInstallEvent(event);
      setVisible(true);
    }

    function handleInstalled() {
      setVisible(false);
      setInstallEvent(null);
      localStorage.setItem("vory-pwa-dismissed", "true");
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [dismissed]);

  async function installApp() {
    if (!installEvent) return;

    installEvent.prompt();

    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
      setInstallEvent(null);
    }
  }

  function dismiss() {
    localStorage.setItem("vory-pwa-dismissed", "true");
    setDismissed(true);
    setVisible(false);
  }

  if (!visible || !installEvent) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md rounded-[2rem] border border-white/10 bg-black/85 p-4 text-white shadow-[0_24px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:bottom-5 lg:left-auto lg:right-5">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-xl bg-white/8 p-2 text-white/45 transition hover:bg-white/12 hover:text-white"
      >
        <X size={16} />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/25 text-violet-100">
          <Download size={22} />
        </div>

        <div>
          <h3 className="font-black">VoryApp'i yükle</h3>
          <p className="mt-1 text-sm leading-6 text-white/50">
            Ana ekrana ekle, uygulama gibi hızlı aç.
          </p>

          <button
            type="button"
            onClick={installApp}
            className="mt-3 rounded-2xl bg-white px-4 py-2 text-sm font-black text-black transition hover:scale-[1.02]"
          >
            Yükle
          </button>
        </div>
      </div>
    </div>
  );
}
