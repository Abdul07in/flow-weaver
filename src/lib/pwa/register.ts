/**
 * Service worker registration with strict guards.
 *
 * Never registers in:
 *  - SSR (no window)
 *  - iframes (Lovable editor preview runs the app inside an iframe)
 *  - Lovable preview / project domains
 *  - non-secure contexts
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1";

  // In preview/iframe/dev: proactively unregister any stale SW so it can't
  // serve cached HTML inside the editor.
  if (inIframe || isPreviewHost || !window.isSecureContext) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        // Auto-update: ping for new SW periodically and on focus.
        const ping = () => void reg.update().catch(() => null);
        setInterval(ping, 60 * 60 * 1000);
        window.addEventListener("focus", ping);

        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — activate immediately.
              sw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        /* silent */
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
