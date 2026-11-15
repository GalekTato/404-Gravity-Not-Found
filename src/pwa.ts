import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const comprobar = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          void registration.update().catch(() => { /* Retry when online or visible again. */ })
        }
      }
      document.addEventListener('visibilitychange', comprobar)
      window.addEventListener('online', comprobar)
      window.setInterval(comprobar, 60_000)
      comprobar()
    },
  })
}
