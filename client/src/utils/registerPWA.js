export function registerPWA() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("VoryApp PWA registered:", registration.scope);
      })
      .catch((error) => {
        console.warn("VoryApp PWA registration failed:", error);
      });
  });
}
